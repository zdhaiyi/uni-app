package com.mycompany.vpn;

import org.json.JSONObject;
import io.dcloud.feature.uniapp.common.UniModule;
import io.dcloud.feature.uniapp.common.UniJSMethod;
import io.dcloud.feature.uniapp.common.UniJSCallback;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.VpnService;
import android.util.Log;

public class MyVpnPlugin extends UniModule {
    private static final int VPN_REQUEST_CODE = 1000;
    private UniJSCallback statusCallback;
    private BroadcastReceiver vpnStatusReceiver;
    
    @UniJSMethod(uiThread = true)
    public void startVpn(JSONObject options, UniJSCallback callback) {
        try {
            Intent intent = VpnService.prepare(mUniSDKInstance.getContext());
            if (intent != null) {
                // 需要用户授权
                mUniSDKInstance.getContext().startActivityForResult(intent, VPN_REQUEST_CODE);
                // 保存回调，在onActivityResult中处理
                statusCallback = callback;
            } else {
                // 已有权限，直接启动
                startVpnService(options, callback);
            }
        } catch (Exception e) {
            JSONObject res = new JSONObject();
            try {
                res.put("success", false);
                res.put("message", "启动VPN异常: " + e.getMessage());
            } catch (Exception ex) {}
            callback.invoke(res);
        }
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == VPN_REQUEST_CODE) {
            if (resultCode == android.app.Activity.RESULT_OK) {
                // 用户授权，启动VPN服务
                try {
                    JSONObject options = new JSONObject();
                    // 这里可以从之前保存的参数中获取
                    startVpnService(options, statusCallback);
                } catch (Exception e) {
                    sendErrorResult(statusCallback, "启动VPN服务失败: " + e.getMessage());
                }
            } else {
                sendErrorResult(statusCallback, "用户拒绝VPN权限");
            }
            statusCallback = null;
        }
    }

    private void startVpnService(JSONObject options, UniJSCallback callback) {
        try {
            Intent intent = new Intent(mUniSDKInstance.getContext(), VpnServiceImpl.class);
            intent.putExtra("server", options.optString("server"));
            intent.putExtra("port", options.optInt("port", 1080));
            intent.putExtra("username", options.optString("username"));
            intent.putExtra("password", options.optString("password"));
            
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                mUniSDKInstance.getContext().startForegroundService(intent);
            } else {
                mUniSDKInstance.getContext().startService(intent);
            }
            
            JSONObject res = new JSONObject();
            res.put("success", true);
            res.put("message", "VPN服务启动中...");
            callback.invoke(res);
            
            // 注册状态监听
            registerVpnStatusReceiver();
            
        } catch (Exception e) {
            sendErrorResult(callback, "启动VPN服务异常: " + e.getMessage());
        }
    }

    @UniJSMethod(uiThread = true)
    public void stopVpn(UniJSCallback callback) {
        try {
            Intent intent = new Intent(mUniSDKInstance.getContext(), VpnServiceImpl.class);
            mUniSDKInstance.getContext().stopService(intent);
            
            JSONObject res = new JSONObject();
            res.put("success", true);
            res.put("message", "VPN服务停止指令已发送");
            callback.invoke(res);
            
            unregisterVpnStatusReceiver();
            
        } catch (Exception e) {
            sendErrorResult(callback, "停止VPN服务异常: " + e.getMessage());
        }
    }

    @UniJSMethod(uiThread = true)
    public void getVpnStatus(UniJSCallback callback) {
        try {
            JSONObject res = new JSONObject();
            // 这里可以检查服务是否在运行
            res.put("isConnected", false); // 简化实现
            res.put("status", "disconnected");
            callback.invoke(res);
        } catch (Exception e) {
            sendErrorResult(callback, "获取VPN状态异常: " + e.getMessage());
        }
    }

    @UniJSMethod(uiThread = true)
    public void onVpnStatusUpdate(UniJSCallback callback) {
        // 设置状态更新回调
        this.statusCallback = callback;
        registerVpnStatusReceiver();
    }

    private void registerVpnStatusReceiver() {
        if (vpnStatusReceiver == null) {
            vpnStatusReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    if ("com.mycompany.vpn.STATUS_UPDATE".equals(intent.getAction())) {
                        boolean connected = intent.getBooleanExtra("connected", false);
                        String message = intent.getStringExtra("message");
                        
                        if (statusCallback != null) {
                            try {
                                JSONObject res = new JSONObject();
                                res.put("connected", connected);
                                res.put("message", message);
                                res.put("status", connected ? "connected" : "disconnected");
                                statusCallback.invoke(res);
                            } catch (Exception e) {
                                Log.e("MyVpnPlugin", "发送状态更新失败: " + e.getMessage());
                            }
                        }
                    }
                }
            };
            
            IntentFilter filter = new IntentFilter("com.mycompany.vpn.STATUS_UPDATE");
            mUniSDKInstance.getContext().registerReceiver(vpnStatusReceiver, filter);
        }
    }

    private void unregisterVpnStatusReceiver() {
        if (vpnStatusReceiver != null) {
            try {
                mUniSDKInstance.getContext().unregisterReceiver(vpnStatusReceiver);
            } catch (Exception e) {
                Log.e("MyVpnPlugin", "取消注册广播接收器失败: " + e.getMessage());
            }
            vpnStatusReceiver = null;
        }
    }

    private void sendErrorResult(UniJSCallback callback, String message) {
        try {
            JSONObject res = new JSONObject();
            res.put("success", false);
            res.put("message", message);
            if (callback != null) {
                callback.invoke(res);
            }
        } catch (Exception e) {
            Log.e("MyVpnPlugin", "发送错误结果失败: " + e.getMessage());
        }
    }

    @Override
    public void onDestroy() {
        unregisterVpnStatusReceiver();
        super.onDestroy();
    }
}
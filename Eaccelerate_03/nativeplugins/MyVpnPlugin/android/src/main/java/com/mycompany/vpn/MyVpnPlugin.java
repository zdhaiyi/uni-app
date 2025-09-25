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
    private UniJSCallback vpnStartCallback;
    private UniJSCallback statusUpdateCallback;
    private BroadcastReceiver vpnStatusReceiver;
    private JSONObject currentOptions;
    
    @UniJSMethod(uiThread = true)
    public void startVpn(JSONObject options, UniJSCallback callback) {
        try {
            this.currentOptions = options;
            this.vpnStartCallback = callback;
            
            Intent intent = VpnService.prepare(mUniSDKInstance.getContext());
            if (intent != null) {
                mUniSDKInstance.getContext().startActivityForResult(intent, VPN_REQUEST_CODE);
            } else {
                startVpnService(options, callback);
            }
        } catch (Exception e) {
            sendErrorResult(callback, "启动VPN异常: " + e.getMessage());
        }
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == VPN_REQUEST_CODE) {
            if (resultCode == android.app.Activity.RESULT_OK) {
                if (currentOptions != null && vpnStartCallback != null) {
                    startVpnService(currentOptions, vpnStartCallback);
                } else {
                    sendErrorResult(vpnStartCallback, "启动参数丢失");
                }
            } else {
                sendErrorResult(vpnStartCallback, "用户拒绝VPN权限");
            }
            currentOptions = null;
            vpnStartCallback = null;
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
            // 实现真实的状态检查逻辑
            boolean isRunning = checkVpnServiceStatus();
            
            JSONObject res = new JSONObject();
            res.put("isConnected", isRunning);
            res.put("status", isRunning ? "connected" : "disconnected");
            callback.invoke(res);
        } catch (Exception e) {
            sendErrorResult(callback, "获取VPN状态异常: " + e.getMessage());
        }
    }

    @UniJSMethod(uiThread = true)
    public void onVpnStatusUpdate(UniJSCallback callback) {
        this.statusUpdateCallback = callback;
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
                        
                        if (statusUpdateCallback != null) {
                            try {
                                JSONObject res = new JSONObject();
                                res.put("connected", connected);
                                res.put("message", message);
                                res.put("status", connected ? "connected" : "disconnected");
                                statusUpdateCallback.invoke(res);
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

    private boolean checkVpnServiceStatus() {
        // 实现检查VPN服务状态的逻辑
        // 可以通过检查服务是否运行、文件状态等方式
        return false;
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
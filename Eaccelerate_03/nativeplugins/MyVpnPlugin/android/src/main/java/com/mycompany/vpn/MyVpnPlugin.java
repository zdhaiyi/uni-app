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
        Log.i("MyVpnPlugin", "开始启动VPN");
        try {
            this.currentOptions = options;
            this.vpnStartCallback = callback;
            
            // 检查VPN权限
            Intent intent = VpnService.prepare(mUniSDKInstance.getContext());
            if (intent != null) {
                // 需要用户授权
                Log.i("MyVpnPlugin", "请求VPN权限");
                mUniSDKInstance.getContext().startActivityForResult(intent, VPN_REQUEST_CODE);
            } else {
                // 已有权限，直接启动
                Log.i("MyVpnPlugin", "已有VPN权限，直接启动服务");
                startVpnService(options, callback);
            }
        } catch (Exception e) {
            Log.e("MyVpnPlugin", "启动VPN异常: " + e.getMessage());
            sendErrorResult(callback, "启动VPN异常: " + e.getMessage());
        }
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        Log.i("MyVpnPlugin", "onActivityResult: " + requestCode + ", resultCode: " + resultCode);
        if (requestCode == VPN_REQUEST_CODE) {
            if (resultCode == android.app.Activity.RESULT_OK) {
                if (currentOptions != null && vpnStartCallback != null) {
                    Log.i("MyVpnPlugin", "用户授权VPN权限，启动服务");
                    startVpnService(currentOptions, vpnStartCallback);
                } else {
                    sendErrorResult(vpnStartCallback, "启动参数丢失");
                }
            } else {
                Log.w("MyVpnPlugin", "用户拒绝VPN权限");
                sendErrorResult(vpnStartCallback, "用户拒绝VPN权限");
            }
            currentOptions = null;
            vpnStartCallback = null;
        }
    }

    private void startVpnService(JSONObject options, UniJSCallback callback) {
        try {
            Log.i("MyVpnPlugin", "启动VPN服务，参数: " + options.toString());
            
            Intent intent = new Intent(mUniSDKInstance.getContext(), VpnServiceImpl.class);
            intent.putExtra("server", options.optString("server", ""));
            intent.putExtra("port", options.optInt("port", 1080));
            intent.putExtra("username", options.optString("username", ""));
            intent.putExtra("password", options.optString("password", ""));
            
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
            Log.e("MyVpnPlugin", "启动VPN服务异常: " + e.getMessage());
            sendErrorResult(callback, "启动VPN服务异常: " + e.getMessage());
        }
    }

    @UniJSMethod(uiThread = true)
    public void stopVpn(JSONObject options, UniJSCallback callback) {
        Log.i("MyVpnPlugin", "停止VPN");
        try {
            Intent intent = new Intent(mUniSDKInstance.getContext(), VpnServiceImpl.class);
            boolean stopped = mUniSDKInstance.getContext().stopService(intent);
            
            JSONObject res = new JSONObject();
            res.put("success", stopped);
            res.put("message", stopped ? "VPN服务停止指令已发送" : "VPN服务未运行");
            callback.invoke(res);
            
            unregisterVpnStatusReceiver();
            
        } catch (Exception e) {
            Log.e("MyVpnPlugin", "停止VPN服务异常: " + e.getMessage());
            sendErrorResult(callback, "停止VPN服务异常: " + e.getMessage());
        }
    }

    @UniJSMethod(uiThread = true)
    public void getVpnStatus(JSONObject options, UniJSCallback callback) {
        try {
            // 简化实现：返回模拟状态
            // 实际应该检查服务运行状态
            boolean isRunning = checkVpnServiceStatus();
            
            JSONObject res = new JSONObject();
            res.put("isConnected", isRunning);
            res.put("status", isRunning ? "connected" : "disconnected");
            res.put("message", isRunning ? "VPN已连接" : "VPN未连接");
            callback.invoke(res);
        } catch (Exception e) {
            Log.e("MyVpnPlugin", "获取VPN状态异常: " + e.getMessage());
            sendErrorResult(callback, "获取VPN状态异常: " + e.getMessage());
        }
    }

    @UniJSMethod(uiThread = true)
    public void onVpnStatusUpdate(JSONObject options, UniJSCallback callback) {
        Log.i("MyVpnPlugin", "注册VPN状态监听");
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
                        
                        Log.i("MyVpnPlugin", "收到VPN状态更新: " + connected + " - " + message);
                        
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
            Log.i("MyVpnPlugin", "VPN状态监听器注册成功");
        }
    }

    private void unregisterVpnStatusReceiver() {
        if (vpnStatusReceiver != null) {
            try {
                mUniSDKInstance.getContext().unregisterReceiver(vpnStatusReceiver);
                Log.i("MyVpnPlugin", "VPN状态监听器注销成功");
            } catch (Exception e) {
                Log.e("MyVpnPlugin", "取消注册广播接收器失败: " + e.getMessage());
            }
            vpnStatusReceiver = null;
        }
    }

    private boolean checkVpnServiceStatus() {
        // 简化实现：返回模拟状态
        // 实际应该通过检查服务运行状态或文件锁来判断
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
        Log.i("MyVpnPlugin", "插件销毁");
        unregisterVpnStatusReceiver();
        super.onDestroy();
    }
}
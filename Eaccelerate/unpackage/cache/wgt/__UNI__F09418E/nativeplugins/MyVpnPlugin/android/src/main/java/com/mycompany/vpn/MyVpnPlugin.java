package com.mycompany.vpn;

import org.json.JSONObject;
import io.dcloud.feature.uniapp.common.UniModule;
import io.dcloud.feature.uniapp.annotation.UniJSMethod;
import io.dcloud.feature.uniapp.common.UniJSCallback;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.VpnService;
import android.util.Log;

public class MyVpnPlugin extends UniModule {
    private static final String TAG = "MyVpnPlugin";
    private static final int VPN_REQUEST_CODE = 1000;
    
    private UniJSCallback vpnStartCallback;
    private UniJSCallback statusUpdateCallback;
    private BroadcastReceiver vpnStatusReceiver;
    private JSONObject currentOptions;
	
	// 添加默认构造函数
	    public MyVpnPlugin() {
	        Log.i(TAG, "MyVpnPlugin 构造函数被调用");
	    }
    
    @UniJSMethod(uiThread = true)
    public void startVpn(JSONObject options, UniJSCallback callback) {
        Log.i(TAG, "开始启动VPN，参数: " + options);
        
        try {
            this.currentOptions = options;
            this.vpnStartCallback = callback;
            
            // 检查VPN权限
            Intent intent = VpnService.prepare(mUniSDKInstance.getContext());
            if (intent != null) {
                // 需要用户授权
                Log.i(TAG, "需要用户授权VPN权限");
                
				 // 注意：这里需要获取到Activity才能调用startActivityForResult
				if (mUniSDKInstance.getContext() instanceof android.app.Activity) {
				                    ((android.app.Activity) mUniSDKInstance.getContext()).startActivityForResult(intent, VPN_REQUEST_CODE);
				                } else {
				                    sendErrorResult(callback, "无法获取Activity上下文");
				                }
            } else {
                // 已有权限，直接启动
                Log.i(TAG, "已有VPN权限，直接启动服务");
                startVpnService(options, callback);
            }
        } catch (Exception e) {
            Log.e(TAG, "启动VPN异常: " + e.getMessage(), e);
            sendErrorResult(callback, "启动VPN异常: " + e.getMessage());
        }
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        Log.i(TAG, "onActivityResult: requestCode=" + requestCode + ", resultCode=" + resultCode);
        
        if (requestCode == VPN_REQUEST_CODE) {
            if (resultCode == android.app.Activity.RESULT_OK) {
                Log.i(TAG, "用户授权VPN权限成功");
                if (currentOptions != null && vpnStartCallback != null) {
                    startVpnService(currentOptions, vpnStartCallback);
                } else {
                    sendErrorResult(vpnStartCallback, "启动参数丢失");
                }
            } else {
                Log.w(TAG, "用户拒绝VPN权限或授权失败");
                sendErrorResult(vpnStartCallback, "用户拒绝VPN权限");
            }
            currentOptions = null;
            vpnStartCallback = null;
        }
    }

    private void startVpnService(JSONObject options, UniJSCallback callback) {
        try {
            Intent intent = new Intent(mUniSDKInstance.getContext(), VpnServiceImpl.class);
            intent.putExtra("server", options.optString("server", ""));
            intent.putExtra("port", options.optInt("port", 1080));
            intent.putExtra("username", options.optString("username", ""));
            intent.putExtra("password", options.optString("password", ""));
            
            Log.i(TAG, "启动VPN服务: " + options.optString("server") + ":" + options.optInt("port"));
            
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                mUniSDKInstance.getContext().startForegroundService(intent);
            } else {
                mUniSDKInstance.getContext().startService(intent);
            }
            
            JSONObject res = new JSONObject();
            res.put("success", true);
            res.put("message", "VPN服务启动中...");
            res.put("status", "starting");
            
            if (callback != null) {
                callback.invoke(res);
            }
            
            // 注册状态接收器
            registerVpnStatusReceiver();
            
        } catch (Exception e) {
            Log.e(TAG, "启动VPN服务异常: " + e.getMessage(), e);
            sendErrorResult(callback, "启动VPN服务异常: " + e.getMessage());
        }
    }

    @UniJSMethod(uiThread = true)
    public void stopVpn(JSONObject options, UniJSCallback callback) {
        Log.i(TAG, "停止VPN");
        
        try {
            Intent intent = new Intent(mUniSDKInstance.getContext(), VpnServiceImpl.class);
            boolean stopped = mUniSDKInstance.getContext().stopService(intent);
            
            JSONObject res = new JSONObject();
            res.put("success", true);
            res.put("message", stopped ? "VPN服务停止指令已发送" : "VPN服务未运行");
            res.put("stopped", stopped);
            
            if (callback != null) {
                callback.invoke(res);
            }
            
            // 取消注册状态接收器
            unregisterVpnStatusReceiver();
            
        } catch (Exception e) {
            Log.e(TAG, "停止VPN服务异常: " + e.getMessage(), e);
            sendErrorResult(callback, "停止VPN服务异常: " + e.getMessage());
        }
    }

    @UniJSMethod(uiThread = true)
    public void getVpnStatus(JSONObject options, UniJSCallback callback) {
        Log.d(TAG, "获取VPN状态");
        
        try {
            // 这里可以实现更精确的状态检查
            // 目前返回基础状态信息
            JSONObject res = new JSONObject();
            res.put("success", true);
            res.put("isConnected", false); // 需要实现真实状态检查
            res.put("status", "disconnected");
            res.put("message", "状态查询完成");
            res.put("timestamp", System.currentTimeMillis());
            
            if (callback != null) {
                callback.invoke(res);
            }
        } catch (Exception e) {
            Log.e(TAG, "获取VPN状态异常: " + e.getMessage(), e);
            sendErrorResult(callback, "获取VPN状态异常: " + e.getMessage());
        }
    }

    @UniJSMethod(uiThread = true)
    public void onVpnStatusUpdate(JSONObject options, UniJSCallback callback) {
        Log.i(TAG, "注册VPN状态更新监听");
        this.statusUpdateCallback = callback;
        registerVpnStatusReceiver();
        
        // 立即返回成功响应
        try {
            JSONObject res = new JSONObject();
            res.put("success", true);
            res.put("message", "状态监听已注册");
            if (callback != null) {
                callback.invoke(res);
            }
        } catch (Exception e) {
            Log.e(TAG, "注册状态监听返回异常: " + e.getMessage());
        }
    }

    private void registerVpnStatusReceiver() {
        if (vpnStatusReceiver == null) {
            vpnStatusReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    if ("com.mycompany.vpn.STATUS_UPDATE".equals(intent.getAction())) {
                        boolean connected = intent.getBooleanExtra("connected", false);
                        String message = intent.getStringExtra("message");
                        String status = intent.getStringExtra("status");
                        long timestamp = intent.getLongExtra("timestamp", System.currentTimeMillis());
                        
                        Log.d(TAG, "收到VPN状态更新: connected=" + connected + ", message=" + message);
                        
                        if (statusUpdateCallback != null) {
                            try {
                                JSONObject res = new JSONObject();
                                res.put("connected", connected);
                                res.put("isConnected", connected);
                                res.put("message", message);
                                res.put("status", status);
                                res.put("timestamp", timestamp);
                                res.put("success", true);
                                
                                statusUpdateCallback.invoke(res);
                            } catch (Exception e) {
                                Log.e(TAG, "发送状态更新失败: " + e.getMessage());
                            }
                        }
                    }
                }
            };
            
            IntentFilter filter = new IntentFilter("com.mycompany.vpn.STATUS_UPDATE");
            try {
                mUniSDKInstance.getContext().registerReceiver(vpnStatusReceiver, filter);
                Log.i(TAG, "VPN状态接收器注册成功");
            } catch (Exception e) {
                Log.e(TAG, "注册VPN状态接收器失败: " + e.getMessage());
            }
        }
    }

    private void unregisterVpnStatusReceiver() {
        if (vpnStatusReceiver != null) {
            try {
                mUniSDKInstance.getContext().unregisterReceiver(vpnStatusReceiver);
                Log.i(TAG, "VPN状态接收器已取消注册");
            } catch (Exception e) {
                Log.e(TAG, "取消注册VPN状态接收器失败: " + e.getMessage());
            }
            vpnStatusReceiver = null;
        }
        statusUpdateCallback = null;
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
            Log.e(TAG, "发送错误结果失败: " + e.getMessage());
        }
    }

    @Override
    public void onDestroy() {
        Log.i(TAG, "MyVpnPlugin销毁");
        unregisterVpnStatusReceiver();
        super.onDestroy();
    }
}
package com.mycompany.vpn;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.net.VpnService;
import android.os.Build;
import android.os.ParcelFileDescriptor;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import java.io.IOException;
import java.util.concurrent.atomic.AtomicBoolean;

public class VpnServiceImpl extends VpnService {
    private static final String TAG = "VpnServiceImpl";
    private static final int NOTIFICATION_ID = 1001;
    private static final String NOTIFICATION_CHANNEL_ID = "vpn_service_channel";
    
    private ParcelFileDescriptor vpnInterface;
    private final AtomicBoolean isRunning = new AtomicBoolean(false);
    private Thread vpnThread;
    
    private String serverAddress;
    private int serverPort;
    private String username;
    private String password;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.i(TAG, "VPN服务启动命令收到，Intent: " + (intent != null ? intent.getExtras() : "null"));
        
        if (intent != null) {
            serverAddress = intent.getStringExtra("server");
            serverPort = intent.getIntExtra("port", 1080);
            username = intent.getStringExtra("username");
            password = intent.getStringExtra("password");
            Log.i(TAG, "服务器配置: " + serverAddress + ":" + serverPort + ", 用户: " + username);
        }
        
        // 如果已经在运行，先停止再启动
        if (isRunning.get()) {
            Log.i(TAG, "VPN服务已在运行，重新启动");
            stopVpn();
            // 等待一下确保完全停止
            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
        
        startVpn();
        return START_STICKY;
    }

    private void startVpn() {
        if (isRunning.get()) {
            Log.w(TAG, "VPN服务已在运行，忽略重复启动");
            return;
        }
        
        Log.i(TAG, "开始启动VPN服务");
        
        try {
            // 创建通知渠道
            createNotificationChannel();
            
            // 配置VPN参数
            Builder builder = new Builder();
            builder.setSession("e加速VPN")
                   .addAddress("10.8.0.2", 24)
                   .addDnsServer("8.8.8.8")
                   .addDnsServer("8.8.4.4")
                   .addRoute("0.0.0.0", 0)
                   .setMtu(1500);
            
            vpnInterface = builder.establish();
            
            if (vpnInterface != null) {
                Log.i(TAG, "VPN接口建立成功");
                // 启动前台服务
                startForeground(NOTIFICATION_ID, createNotification());
                isRunning.set(true);
                startVpnThread();
                Log.i(TAG, "VPN服务启动成功");
                sendVpnStatusBroadcast(true, "VPN连接已建立 - " + serverAddress);
            } else {
                Log.e(TAG, "建立VPN接口失败");
                sendVpnStatusBroadcast(false, "建立VPN接口失败");
                stopSelf();
            }
        } catch (Exception e) {
            Log.e(TAG, "启动VPN失败: " + e.getMessage(), e);
            sendVpnStatusBroadcast(false, "启动VPN失败: " + e.getMessage());
            stopSelf();
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "VPN服务通道",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("e加速VPN服务运行通知");
            channel.setShowBadge(false);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
                Log.i(TAG, "通知渠道创建成功");
            }
        }
    }

    private Notification createNotification() {
        // 创建点击通知时打开的Intent
        Intent intent = new Intent(this, getClass());
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, intent, flags);
        
        // 尝试获取应用图标
        int iconResId = getResources().getIdentifier("icon", "mipmap", getPackageName());
        if (iconResId == 0) {
            iconResId = android.R.drawable.ic_dialog_info;
        }
        
        return new NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setContentTitle("e加速VPN")
            .setContentText("已连接到: " + (serverAddress != null ? serverAddress : "未知服务器"))
            .setSmallIcon(iconResId)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setWhen(System.currentTimeMillis())
            .build();
    }

    private void startVpnThread() {
        vpnThread = new Thread(() -> {
            Log.i(TAG, "VPN工作线程启动");
            
            try {
                int heartbeatCount = 0;
                while (isRunning.get()) {
                    try {
                        // 模拟工作，每5秒记录一次心跳
                        Thread.sleep(5000);
                        
                        if (!isRunning.get()) {
                            break;
                        }
                        
                        heartbeatCount++;
                        Log.d(TAG, "VPN连接心跳: " + heartbeatCount);
                        
                        // 每10次心跳更新一次通知
                        if (heartbeatCount % 10 == 0) {
                            updateNotification();
                        }
                        
                    } catch (InterruptedException e) {
                        Log.w(TAG, "VPN线程被中断");
                        break;
                    }
                }
                
            } catch (Exception e) {
                Log.e(TAG, "VPN工作线程异常: " + e.getMessage(), e);
            } finally {
                Log.i(TAG, "VPN工作线程结束");
                if (isRunning.get()) {
                    // 如果还在运行状态但线程结束了，说明出现了异常
                    stopVpn();
                }
            }
        });
        
        vpnThread.setName("VPN-Worker");
        vpnThread.start();
    }
    
    private void updateNotification() {
        try {
            Notification notification = createNotification();
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.notify(NOTIFICATION_ID, notification);
            }
        } catch (Exception e) {
            Log.w(TAG, "更新通知失败: " + e.getMessage());
        }
    }

    private void stopVpn() {
        if (!isRunning.getAndSet(false)) {
            Log.i(TAG, "VPN服务已经停止");
            return;
        }
        
        Log.i(TAG, "开始停止VPN服务");
        
        // 停止前台服务
        stopForeground(true);
        
        // 中断工作线程
        if (vpnThread != null) {
            vpnThread.interrupt();
            try {
                vpnThread.join(5000); // 等待5秒
            } catch (InterruptedException e) {
                Log.e(TAG, "等待线程停止时被中断: " + e.getMessage());
                Thread.currentThread().interrupt();
            }
            vpnThread = null;
        }
        
        // 关闭VPN接口
        if (vpnInterface != null) {
            try {
                vpnInterface.close();
                Log.i(TAG, "VPN接口已关闭");
            } catch (IOException e) {
                Log.e(TAG, "关闭VPN接口异常: " + e.getMessage());
            }
            vpnInterface = null;
        }
        
        sendVpnStatusBroadcast(false, "VPN连接已断开");
        Log.i(TAG, "VPN服务已完全停止");
        
        // 停止服务自身
        stopSelf();
    }

    private void sendVpnStatusBroadcast(boolean connected, String message) {
        try {
            Intent intent = new Intent("com.mycompany.vpn.STATUS_UPDATE");
            intent.putExtra("connected", connected);
            intent.putExtra("isConnected", connected);
            intent.putExtra("message", message);
            intent.putExtra("status", connected ? "connected" : "disconnected");
            intent.putExtra("timestamp", System.currentTimeMillis());
            
            sendBroadcast(intent);
            Log.d(TAG, "发送状态广播: connected=" + connected + ", message=" + message);
        } catch (Exception e) {
            Log.e(TAG, "发送状态广播失败: " + e.getMessage());
        }
    }

    @Override
    public void onDestroy() {
        Log.i(TAG, "VPN服务被销毁");
        stopVpn();
        super.onDestroy();
    }
    
    @Override
    public void onRevoke() {
        Log.i(TAG, "VPN权限被撤销");
        stopVpn();
        super.onRevoke();
    }
}
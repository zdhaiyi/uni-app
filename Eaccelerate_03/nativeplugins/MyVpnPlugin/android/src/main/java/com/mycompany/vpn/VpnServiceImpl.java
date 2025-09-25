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
import java.net.Socket;
import java.util.concurrent.atomic.AtomicBoolean;

public class VpnServiceImpl extends VpnService {
    private static final String TAG = "VpnServiceImpl";
    private static final int NOTIFICATION_ID = 1;
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
        if (intent != null) {
            serverAddress = intent.getStringExtra("server");
            serverPort = intent.getIntExtra("port", 1080);
            username = intent.getStringExtra("username");
            password = intent.getStringExtra("password");
        }
        
        // 如果已经在运行，先停止再启动
        if (isRunning.get()) {
            stopVpn();
        }
        
        startVpn();
        return START_STICKY;
    }

    private void startVpn() {
        if (isRunning.get()) {
            return;
        }
        
        try {
            // 创建通知渠道
            createNotificationChannel();
            
            Builder builder = new Builder();
            builder.setSession("e加速VPN")
                   .addAddress("10.8.0.2", 24)
                   .addDnsServer("8.8.8.8")
                   .addDnsServer("8.8.4.4")
                   .addRoute("0.0.0.0", 0)
                   .setMtu(1500);
            
            vpnInterface = builder.establish();
            
            if (vpnInterface != null) {
                // 启动前台服务
                startForeground(NOTIFICATION_ID, createNotification());
                isRunning.set(true);
                startVpnThread();
                Log.i(TAG, "VPN服务启动成功");
                sendVpnStatusBroadcast(true, "VPN连接已建立");
            }
        } catch (Exception e) {
            Log.e(TAG, "启动VPN失败: " + e.getMessage());
            sendVpnStatusBroadcast(false, "启动VPN失败: " + e.getMessage());
            stopSelf();
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "VPN服务",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("e加速VPN服务运行中");
            NotificationManager manager = getSystemService(NotificationManager.class);
            manager.createNotificationChannel(channel);
        }
    }

    private Notification createNotification() {
        Intent intent = new Intent(this, getClass());
        int flags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? 
                   PendingIntent.FLAG_IMMUTABLE : 0;
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, intent, flags);
        
        return new NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setContentTitle("e加速VPN")
            .setContentText("VPN连接运行中")
            .setSmallIcon(android.R.drawable.ic_dialog_info) // 需要替换为实际图标
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build();
    }

    private void startVpnThread() {
        vpnThread = new Thread(() -> {
            try {
                Log.i(TAG, "连接到代理服务器: " + serverAddress + ":" + serverPort);
                
                // 这里应该实现真正的代理逻辑
                // 目前只是模拟连接
                Thread.sleep(1000); // 模拟连接过程
                
                // 模拟数据转发（实际需要实现完整的代理协议）
                while (isRunning.get()) {
                    Thread.sleep(1000); // 保持连接
                    // 实际应该在这里处理VPN数据包转发
                }
                
            } catch (Exception e) {
                Log.e(TAG, "VPN线程异常: " + e.getMessage());
            } finally {
                stopVpn();
            }
        });
        vpnThread.start();
    }

    private void stopVpn() {
        if (!isRunning.getAndSet(false)) {
            return; // 已经停止
        }
        
        Log.i(TAG, "停止VPN服务");
        
        // 停止前台服务
        stopForeground(true);
        
        if (vpnThread != null) {
            vpnThread.interrupt();
            try {
                vpnThread.join(3000);
            } catch (InterruptedException e) {
                Log.e(TAG, "停止VPN线程异常: " + e.getMessage());
            }
            vpnThread = null;
        }
        
        if (vpnInterface != null) {
            try {
                vpnInterface.close();
            } catch (IOException e) {
                Log.e(TAG, "关闭VPN接口异常: " + e.getMessage());
            }
            vpnInterface = null;
        }
        
        sendVpnStatusBroadcast(false, "VPN连接已断开");
        Log.i(TAG, "VPN服务已完全停止");
    }

    private void sendVpnStatusBroadcast(boolean connected, String message) {
        try {
            Intent intent = new Intent("com.mycompany.vpn.STATUS_UPDATE");
            intent.putExtra("connected", connected);
            intent.putExtra("message", message);
            sendBroadcast(intent);
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
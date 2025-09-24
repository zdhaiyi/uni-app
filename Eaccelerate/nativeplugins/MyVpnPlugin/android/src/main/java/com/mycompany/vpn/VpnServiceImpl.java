package com.mycompany.vpn;

import android.app.PendingIntent;
import android.content.Intent;
import android.net.VpnService;
import android.os.Build;
import android.os.ParcelFileDescriptor;
import android.system.OsConstants;
import android.util.Log;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.concurrent.atomic.AtomicBoolean;

public class VpnServiceImpl extends VpnService {
    private static final String TAG = "VpnServiceImpl";
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
        
        startVpn();
        return START_STICKY;
    }

    private void startVpn() {
        if (isRunning.get()) {
            return;
        }
        
        try {
            Builder builder = new Builder();
            builder.setSession("e加速VPN")
                   .addAddress("10.8.0.2", 24)
                   .addDnsServer("8.8.8.8")
                   .addDnsServer("8.8.4.4")
                   .addRoute("0.0.0.0", 0)
                   .setMtu(1500);
            
            // 设置前台服务
            String channelId = "vpn_service";
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                builder.setConfigureIntent(PendingIntent.getActivity(this, 0, 
                    new Intent(this, getClass()), PendingIntent.FLAG_IMMUTABLE));
            }
            
            vpnInterface = builder.establish();
            
            if (vpnInterface != null) {
                isRunning.set(true);
                startVpnThread();
                Log.i(TAG, "VPN服务启动成功");
                
                // 发送广播通知前端
                sendVpnStatusBroadcast(true, "VPN连接已建立");
            }
        } catch (Exception e) {
            Log.e(TAG, "启动VPN失败: " + e.getMessage());
            sendVpnStatusBroadcast(false, "启动VPN失败: " + e.getMessage());
            stopSelf();
        }
    }

    private void startVpnThread() {
        vpnThread = new Thread(() -> {
            try (FileInputStream in = new FileInputStream(vpnInterface.getFileDescriptor());
                 FileOutputStream out = new FileOutputStream(vpnInterface.getFileDescriptor())) {
                
                ByteBuffer packet = ByteBuffer.allocate(32767);
                
                while (isRunning.get()) {
                    int length = in.read(packet.array());
                    if (length > 0) {
                        // 这里处理数据包转发
                        // 实际实现需要根据您的VPN协议来处理
                        packet.limit(length);
                        
                        // 模拟数据处理
                        Thread.sleep(10);
                        
                        // 将处理后的数据写回VPN接口
                        out.write(packet.array(), 0, length);
                        packet.clear();
                    }
                }
            } catch (IOException | InterruptedException e) {
                Log.e(TAG, "VPN数据转发异常: " + e.getMessage());
            } finally {
                stopVpn();
            }
        });
        vpnThread.start();
    }

    private void stopVpn() {
        isRunning.set(false);
        
        if (vpnThread != null) {
            vpnThread.interrupt();
            try {
                vpnThread.join(2000);
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
        Log.i(TAG, "VPN服务已停止");
        stopSelf();
    }

    private void sendVpnStatusBroadcast(boolean connected, String message) {
        Intent intent = new Intent("com.mycompany.vpn.STATUS_UPDATE");
        intent.putExtra("connected", connected);
        intent.putExtra("message", message);
        sendBroadcast(intent);
    }

    @Override
    public void onDestroy() {
        stopVpn();
        super.onDestroy();
    }
}
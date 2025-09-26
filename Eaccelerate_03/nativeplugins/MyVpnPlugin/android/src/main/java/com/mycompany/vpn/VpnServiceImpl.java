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

import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.Socket;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
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
        Log.i(TAG, "VPN服务启动命令接收");
        
        if (intent != null) {
            serverAddress = intent.getStringExtra("server");
            serverPort = intent.getIntExtra("port", 1080);
            username = intent.getStringExtra("username");
            password = intent.getStringExtra("password");
            
            Log.i(TAG, "服务器参数: " + serverAddress + ":" + serverPort);
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
            
            // 配置VPN接口
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
            } else {
                throw new Exception("建立VPN接口失败");
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
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build();
    }

    private void startVpnThread() {
        vpnThread = new Thread(() -> {
            FileInputStream in = null;
            FileOutputStream out = null;
            Socks5ProxyHandler proxyHandler = null;
            
            try {
                in = new FileInputStream(vpnInterface.getFileDescriptor());
                out = new FileOutputStream(vpnInterface.getFileDescriptor());
                
                // 连接到SOCKS5代理服务器
                proxyHandler = new Socks5ProxyHandler(serverAddress, serverPort, username, password);
                if (!proxyHandler.connect()) {
                    Log.e(TAG, "无法连接到SOCKS5代理服务器");
                    stopVpn();
                    return;
                }
                
                Log.i(TAG, "SOCKS5代理连接成功，开始处理网络流量");
                
                // 处理VPN数据包
                processVpnPackets(in, out, proxyHandler);
                
            } catch (Exception e) {
                Log.e(TAG, "VPN线程异常: " + e.getMessage());
            } finally {
                if (proxyHandler != null) {
                    proxyHandler.close();
                }
                try {
                    if (in != null) in.close();
                    if (out != null) out.close();
                } catch (IOException e) {
                    Log.e(TAG, "关闭流异常: " + e.getMessage());
                }
                stopVpn();
            }
        });
        vpnThread.start();
    }

    private void processVpnPackets(FileInputStream in, FileOutputStream out, 
                                  Socks5ProxyHandler proxyHandler) throws IOException {
        byte[] packet = new byte[32767];
        
        while (isRunning.get()) {
            int length = in.read(packet);
            if (length > 0) {
                // 简化处理：将所有流量转发到SOCKS5代理
                // 实际应该解析IP包并正确处理
                proxyHandler.forwardData(packet, length, out);
            }
            
            // 短暂休眠避免CPU占用过高
            try {
                Thread.sleep(10);
            } catch (InterruptedException e) {
                break;
            }
        }
    }

    // SOCKS5代理处理类
    private class Socks5ProxyHandler {
        private Socket proxySocket;
        private DataInputStream input;
        private DataOutputStream output;
        private String server;
        private int port;
        private String username;
        private String password;
        
        public Socks5ProxyHandler(String server, int port, String username, String password) {
            this.server = server;
            this.port = port;
            this.username = username;
            this.password = password;
        }
        
        public boolean connect() {
            try {
                Log.i(TAG, "正在连接SOCKS5代理: " + server + ":" + port);
                proxySocket = new Socket(server, port);
                proxySocket.setSoTimeout(30000); // 30秒超时
                input = new DataInputStream(proxySocket.getInputStream());
                output = new DataOutputStream(proxySocket.getOutputStream());
                
                // SOCKS5握手
                return performHandshake() && authenticate();
            } catch (Exception e) {
                Log.e(TAG, "SOCKS5连接失败: " + e.getMessage());
                return false;
            }
        }
        
        private boolean performHandshake() throws IOException {
            // 发送握手请求
            byte[] handshake = new byte[] {
                0x05, // SOCKS版本5
                0x01, // 认证方法数量
                0x02  // 用户名密码认证
            };
            output.write(handshake);
            output.flush();
            
            // 读取服务器响应
            byte[] response = new byte[2];
            input.readFully(response);
            
            boolean success = response[0] == 0x05 && response[1] != 0xFF;
            Log.i(TAG, "SOCKS5握手" + (success ? "成功" : "失败"));
            return success;
        }
        
        private boolean authenticate() throws IOException {
            if (username == null || password == null || username.isEmpty()) {
                Log.i(TAG, "无需SOCKS5认证");
                return true;
            }
            
            // 发送认证信息
            byte[] userBytes = username.getBytes("UTF-8");
            byte[] passBytes = password.getBytes("UTF-8");
            
            ByteArrayOutputStream authStream = new ByteArrayOutputStream();
            authStream.write(0x01); // 认证版本
            authStream.write(userBytes.length);
            authStream.write(userBytes);
            authStream.write(passBytes.length);
            authStream.write(passBytes);
            
            output.write(authStream.toByteArray());
            output.flush();
            
            // 读取认证响应
            byte[] authResponse = new byte[2];
            input.readFully(authResponse);
            
            boolean success = authResponse[0] == 0x01 && authResponse[1] == 0x00;
            Log.i(TAG, "SOCKS5认证" + (success ? "成功" : "失败"));
            return success;
        }
        
        public void forwardData(byte[] data, int length, FileOutputStream vpnOutput) {
            try {
                // 简化实现：建立到目标地址的连接并转发数据
                // 这里应该实现完整的IP包解析和SOCKS5 CONNECT命令
                
                // 临时实现：直接转发原始数据（需要完善）
                if (output != null) {
                    output.write(data, 0, length);
                    output.flush();
                    
                    // 读取响应（简化处理）
                    byte[] response = new byte[4096];
                    int bytesRead = input.read(response);
                    if (bytesRead > 0) {
                        vpnOutput.write(response, 0, bytesRead);
                    }
                }
            } catch (Exception e) {
                Log.e(TAG, "数据转发失败: " + e.getMessage());
            }
        }
        
        public void close() {
            try {
                if (input != null) input.close();
                if (output != null) output.close();
                if (proxySocket != null) proxySocket.close();
            } catch (IOException e) {
                Log.e(TAG, "关闭SOCKS5连接失败: " + e.getMessage());
            }
        }
    }

    private void stopVpn() {
        if (!isRunning.getAndSet(false)) {
            return;
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
            Log.i(TAG, "发送状态广播: " + connected + " - " + message);
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
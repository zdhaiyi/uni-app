package com.mycompany.vpn;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.ParcelFileDescriptor;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.util.concurrent.atomic.AtomicBoolean;

public class VpnServiceImpl extends VpnService {
    private static final String TAG = "VpnServiceImpl";
    private static final String CHANNEL_ID = "vpn_channel";
    private ParcelFileDescriptor tun;
    private final AtomicBoolean running = new AtomicBoolean(false);

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // 启动前台服务显示通知
        startForeground(1, buildNotification("正在连接..."));

        if (running.compareAndSet(false, true)) {
            new Thread(() -> {
                try {
                    // 获取配置数据
                    String json = intent.getStringExtra("config");
                    VpnConfig cfg = VpnConfig.fromJson(json);

                    // 创建 VPN 隧道
                    Builder builder = new Builder();
                    builder.setSession(cfg.sessionName);
                    builder.addAddress("10.0.0.2", 32);
                    builder.addDnsServer(cfg.dns1);
                    if (cfg.dns2 != null) builder.addDnsServer(cfg.dns2);
                    builder.addRoute("0.0.0.0", 0);
                    tun = builder.establish();

                    // 启动 SOCKS5 代理
                    startSock5Proxy(cfg);

                    updateNotification("已连接");
                } catch (Exception e) {
                    Log.e(TAG, "VPN 启动失败", e);
                    stopSelf();
                }
            }, "vpn-core").start();
        }
        return START_STICKY;
    }

    private void startSock5Proxy(VpnConfig cfg) {
        try {
            // 根据提供的节点参数，建立 SOCKS5 代理连接
            Socket socket = new Socket();
            socket.connect(new InetSocketAddress(cfg.host, Integer.parseInt(cfg.port)));
            // 使用代理进行数据转发
            tun2socks(socket);
        } catch (IOException e) {
            Log.e(TAG, "SOCKS5 代理连接失败", e);
        }
    }

    private void tun2socks(Socket socket) {
        // 将 TUN 设备的流量通过 SOCKS5 转发
        // 这里是代理转发的逻辑，可以实现 SOCKS5 客户端连接
    }

    private Notification buildNotification(String text) {
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (Build.VERSION.SDK_INT >= 26) {
            nm.createNotificationChannel(new NotificationChannel(
                CHANNEL_ID, "VPN 连接", NotificationManager.IMPORTANCE_LOW));
        }
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("VPN")
                .setContentText(text)
                .setSmallIcon(android.R.drawable.stat_sys_vpn_ic)
                .setOngoing(true)
                .build();
    }

    private void updateNotification(String text) {
        NotificationManager nm = getSystemService(NotificationManager.class);
        nm.notify(1, buildNotification(text));
    }

    @Override
    public void onDestroy() {
        stopVpn();
        super.onDestroy();
    }

    private void stopVpn() {
        running.set(false);
        try {
            if (tun != null) tun.close();
        } catch (IOException ignored) {}
        stopForeground(true);
    }
}


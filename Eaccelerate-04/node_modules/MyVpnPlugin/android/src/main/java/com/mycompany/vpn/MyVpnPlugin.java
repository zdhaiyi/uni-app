package com.mycompany.vpn;

import com.dcloud.android.upgrade.UniModule;
import org.json.JSONObject;
import com.dcloud.js.IUniJsCallback;
import android.content.Context;
import android.content.Intent;

public class MyVpnPlugin extends UniModule {

    @UniJSMethod(uiThread = true)
    public void prepare(IUniJsCallback cb) {
        Context ctx = mUniSDKInstance.getContext();
        Intent intent = VpnService.prepare(ctx);
        if (intent != null) {
            // 启动透明授权 Activity，内部会 startActivityForResult 后回传结果
            Intent bridge = new Intent(ctx, VpnPermissionActivity.class);
            bridge.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(bridge);
            // 授权结果通过广播发回来后再回调 cb
        } else {
            // 如果已授权
            if (cb != null) cb.invoke(new JSONObject().put("prepared", true));
        }
    }

    @UniJSMethod(uiThread = true)
    public void start(JSONObject cfg, IUniJsCallback cb) {
        Context ctx = mUniSDKInstance.getContext();
        Intent i = new Intent(ctx, VpnServiceImpl.class);
        i.putExtra("config", cfg.toString());
        // Android 8.0+ 用 ContextCompat.startForegroundService 更稳妥
        ContextCompat.startForegroundService(ctx, i);
        if (cb != null) cb.invoke(new JSONObject().put("ok", true));
    }

    @UniJSMethod(uiThread = true)
    public void stop(IUniJsCallback cb) {
        Context ctx = mUniSDKInstance.getContext();
        ctx.stopService(new Intent(ctx, VpnServiceImpl.class));
        if (cb != null) cb.invoke(new JSONObject().put("ok", true));
    }
}

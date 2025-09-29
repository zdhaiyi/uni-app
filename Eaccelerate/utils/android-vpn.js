// utils/android-vpn.js
// 统一封装原生插件，避免 H5/小程序环境报错；没有插件时进入“模拟模式”

class AndroidVpnManager {
  constructor() {
    this.vpn = null;                  // 插件对象
    this.available = false;           // 插件是否可用
    this.inited = false;
    this.isConnecting = false;
    this.isConnected = false;
    this.statusCb = null;             // JS 层状态回调
    this.timer = null;                // 模拟模式计时
    this.connectStartAt = 0;          // 连接开始时间戳
  }

  // 触发状态回调
  _emit(status) {
    // 统一结构：{connected:boolean, status:'connected/connecting/disconnected/error', message?:string}
    if (typeof this.statusCb === 'function') {
      try { this.statusCb(status || {}); } catch (e) { console.error(e); }
    }
  }

  // 初始化：装载原生插件（仅 Android APP-PLUS 环境）
  async initialize() {
    if (this.inited) return this.available;

    // #ifdef APP-PLUS
    try {
      const sys = uni.getSystemInfoSync();
      if (sys.platform !== 'android') {
        console.warn('[VPN] 非 Android 平台，跳过原生插件');
        this.available = false; this.inited = true; return false;
      }
      if (typeof uni.requireNativePlugin !== 'function') {
        console.warn('[VPN] requireNativePlugin 不可用');
        this.available = false; this.inited = true; return false;
      }

      // 名称要和 package.json / dcloud_uniplugins.json 的 name/id 一致
      this.vpn = uni.requireNativePlugin('MyVpnPlugin');
      this.available = !!this.vpn;

      if (this.available) {
        // 如果原生做了状态回调 onVpnStatusUpdate，可以注册
        if (typeof this.vpn.onVpnStatusUpdate === 'function') {
          this.vpn.onVpnStatusUpdate((s) => {
            // 兼容不同写法
            const connected = !!(s && (s.connected || s.isConnected));
            const msg = s && (s.message || s.msg) || (connected ? '已连接' : '未连接');
            this.isConnected = connected;
            this.isConnecting = false;
            this._emit({
              connected,
              status: connected ? 'connected' : 'disconnected',
              message: msg
            });
          });
        }
      } else {
        console.warn('[VPN] 未加载到原生插件，将使用模拟模式');
      }
    } catch (e) {
      console.error('[VPN] 初始化失败：', e);
      this.available = false;
    }
    this.inited = true;
    return this.available;
    // #endif

    // #ifndef APP-PLUS
    this.available = false;
    this.inited = true;
    return false;
    // #endif
  }

  onStatusUpdate(cb) { this.statusCb = cb; }
  offStatusUpdate() { this.statusCb = null; }

  async getStatus() {
    if (!this.inited) await this.initialize();

    // #ifdef APP-PLUS
    if (this.available && typeof this.vpn.getVpnStatus === 'function') {
      try {
        return await new Promise(resolve => {
          this.vpn.getVpnStatus((s) => {
            const connected = !!(s && (s.connected || s.isConnected));
            resolve({
              connected,
              status: connected ? 'connected' : 'disconnected',
              message: s && (s.message || s.msg) || (connected ? '已连接' : '未连接')
            });
          });
        });
      } catch (e) {}
    }
    // #endif

    return {
      connected: this.isConnected,
      status: this.isConnected ? 'connected' : (this.isConnecting ? 'connecting' : 'disconnected'),
      message: this.isConnected ? '已连接' : '未连接'
    };
  }

  // 连接
  async connect(node) {
    if (!this.inited) await this.initialize();

    // 前置校验
    if (!node || !node.host || !node.port) {
      throw new Error('节点信息不完整');
    }
    if (this.isConnecting) throw new Error('连接中，请稍候');
    if (this.isConnected) throw new Error('已连接，请先断开');

    // 参数组装（支持无账号密码的 SOCKS5）
    const params = {
      proxyType: 'socks5',
      server: node.host,
      port: parseInt(node.port, 10) || 1080,
      username: node.account || '',
      password: node.password || '',
      authType: (node.account && node.password) ? 'password' : 'none'
    };

    this.isConnecting = true;
    this._emit({ connected: false, status: 'connecting', message: '连接中...' });

    // #ifdef APP-PLUS
    if (this.available && typeof this.vpn.startVpn === 'function') {
      return await new Promise((resolve, reject) => {
        // 设置 30s 超时
        const to = setTimeout(() => {
          this.isConnecting = false;
          reject(new Error('连接超时'));
          this._emit({ connected: false, status: 'error', message: '连接超时' });
        }, 30000);

        try {
          this.vpn.startVpn(params, (ret) => {
            clearTimeout(to);
            this.isConnecting = false;
            const ok = !!(ret && ret.success);
            this.isConnected = ok;
            this.connectStartAt = ok ? Date.now() : 0;
            this._emit({
              connected: ok,
              status: ok ? 'connected' : 'error',
              message: (ret && ret.message) || (ok ? '连接成功' : '连接失败')
            });
            return ok ? resolve(ret) : reject(new Error((ret && ret.message) || '连接失败'));
          });
        } catch (e) {
          clearTimeout(to);
          this.isConnecting = false;
          this.isConnected = false;
          this._emit({ connected: false, status: 'error', message: e.message || '连接异常' });
          reject(e);
        }
      });
    }
    // #endif

    // 非 APP 或无插件 → 模拟模式（仅用于联调界面）
    return await this._mockConnect();
  }

  // 断开
  async disconnect() {
    // #ifdef APP-PLUS
    if (this.available && typeof this.vpn.stopVpn === 'function') {
      return await new Promise((resolve) => {
        try {
          this.vpn.stopVpn((ret) => {
            this.isConnected = false;
            this.isConnecting = false;
            this.connectStartAt = 0;
            this._emit({ connected: false, status: 'disconnected', message: (ret && ret.message) || '已断开' });
            resolve(ret || { success: true });
          });
        } catch (e) {
          this.isConnected = false;
          this.isConnecting = false;
          this.connectStartAt = 0;
          this._emit({ connected: false, status: 'disconnected', message: '已断开' });
          resolve({ success: true });
        }
      });
    }
    // #endif

    // 模拟
    clearInterval(this.timer);
    this.timer = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.connectStartAt = 0;
    this._emit({ connected: false, status: 'disconnected', message: '已断开（模拟）' });
    return { success: true };
  }

  // ——— 模拟模式（仅调界面用） ———
  async _mockConnect() {
    return await new Promise((resolve) => {
      setTimeout(() => {
        this.isConnecting = false;
        this.isConnected = true;
        this.connectStartAt = Date.now();
        this._emit({ connected: true, status: 'connected', message: '模拟连接成功' });
        // 模拟心跳
        clearInterval(this.timer);
        this.timer = setInterval(() => {
          if (this.isConnected) this._emit({ connected: true, status: 'connected', message: '模拟运行中' });
        }, 3000);
        resolve({ success: true, message: '模拟连接成功' });
      }, 1000);
    });
  }
}

const mgr = new AndroidVpnManager();
export default mgr;



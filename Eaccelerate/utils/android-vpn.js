// utils/android-vpn.js
// 统一封装原生插件；未集成 AAR 的基座会自动进入“模拟模式”（仅用于界面联调）

class AndroidVpnManager {
  constructor() {
    this.vpn = null;                  // 原生插件对象
    this.available = false;           // 插件是否可用
    this.inited = false;              // 是否初始化过
    this.isConnecting = false;
    this.isConnected = false;
    this.statusCb = null;             // JS 层状态回调
    this.timer = null;                // 模拟模式心跳
    this.connectStartAt = 0;
  }

  // 等待 plusready（已就绪则立即返回）
  _waitForPlusReady() {
    return new Promise((resolve) => {
      // #ifdef APP-PLUS
      if (typeof window !== 'undefined' && window.plus) return resolve();
      const done = () => {
        document.removeEventListener('plusready', done);
        resolve();
      };
      document.addEventListener('plusready', done);
      // 兜底超时（某些 ROM 偶尔漏事件）
      setTimeout(() => { if (typeof window !== 'undefined' && window.plus) resolve(); }, 3000);
      // #endif

      // #ifndef APP-PLUS
      resolve();
      // #endif
    });
  }

  // 触发状态回调
  _emit(status) {
    if (typeof this.statusCb === 'function') {
      try { this.statusCb(status || {}); } catch (e) { console.error(e); }
    }
  }

  // 初始化：装载原生插件（仅 Android APP-PLUS）
  async initialize(forceRetry = false) {
    if (this.inited && !forceRetry) return this.available;

    await this._waitForPlusReady();

    // #ifdef APP-PLUS
    try {
      const sys = uni.getSystemInfoSync && uni.getSystemInfoSync();
      if (!sys || sys.platform !== 'android') {
        console.warn('[VPN] 非 Android 平台，跳过原生插件');
        this.available = false; this.inited = true; return false;
      }
      if (typeof uni.requireNativePlugin !== 'function') {
        console.warn('[VPN] requireNativePlugin 不可用（基座未集成 AAR？）');
        this.available = false; this.inited = true; return false;
      }

      // 名称要与 nativeplugins/MyVpnPlugin/package.json 中的 "id"/"name" 一致
      this.vpn = uni.requireNativePlugin('MyVpnPlugin');
      this.available = !!this.vpn;

      if (this.available) {
        // 绑定原生状态回调（若原生提供）
        if (typeof this.vpn.onVpnStatusUpdate === 'function') {
          this.vpn.onVpnStatusUpdate((s) => {
            const connected = !!(s && (s.connected || s.isConnected));
            const msg = (s && (s.message || s.msg)) || (connected ? '已连接' : '未连接');
            this.isConnected = connected;
            this.isConnecting = false;
            this._emit({ connected, status: connected ? 'connected' : 'disconnected', message: msg });
          });
        }
        console.log('[VPN] 原生插件加载成功');
      } else {
        console.warn('[VPN] 未加载到原生插件，将使用模拟模式（多半是基座未包含 AAR）');
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
              message: (s && (s.message || s.msg)) || (connected ? '已连接' : '未连接')
            });
          });
        });
      } catch (e) { /* fallthrough to mock */ }
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
    // 允许在点击“连接”时再尝试一次初始化（防止首次过早初始化失败）
    if (!this.inited || !this.available) await this.initialize(true);

    // 前置校验
    if (!node || !node.host || !node.port) throw new Error('节点信息不完整');
    if (this.isConnecting) throw new Error('连接中，请稍候');
    if (this.isConnected) throw new Error('已连接，请先断开');

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
            ok ? resolve(ret) : reject(new Error((ret && ret.message) || '连接失败'));
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

    // 非 APP 或无插件 → 模拟模式（仅用于界面联调）
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
        clearInterval(this.timer);
        this.timer = setInterval(() => {
          if (this.isConnected) this._emit({ connected: true, status: 'connected', message: '模拟运行中' });
        }, 3000);
        resolve({ success: true, message: '模拟连接成功' });
      }, 1000);
    });
  }
}

// —— 仅用于调试：确认插件是否被集成到基座 ——
// 如果在 plusready 之后调用，也会立即返回结果
let debugPlugin = null;
export async function ensurePluginReady() {
  const mgr = androidVpnManager; // 复用同一份 plusready 等待逻辑
  await mgr._waitForPlusReady();

  // #ifdef APP-PLUS
  try {
    debugPlugin = uni.requireNativePlugin('MyVpnPlugin');
    console.log('[VPN] native plugin =', debugPlugin ? 'OK' : 'NULL');
    return !!debugPlugin;
  } catch (e) {
    console.log('[VPN] requireNativePlugin error:', e);
    return false;
  }
  // #endif

  // #ifndef APP-PLUS
  return false;
  // #endif
}

export function getPlugin() {
  return debugPlugin;
}

const androidVpnManager = new AndroidVpnManager();
export default androidVpnManager;



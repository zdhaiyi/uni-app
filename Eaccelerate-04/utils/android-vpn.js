// utils/android-vpn.js
// 纯 JS 版本：不依赖原生插件，不做系统级 VPN，只维护“选择的 SOCKS5 节点 + 连接状态”
// 供页面使用：connect(node)、disconnect()、getStatus()、onStatusUpdate(cb)、offStatusUpdate()

const STORAGE_KEYS = {
  ACTIVE_NODE: 'ACTIVE_PROXY_NODE',
  CONNECTED: 'PROXY_CONNECTED'
};

class SimpleProxyManager {
  constructor() {
    this.isInitialized = false;
    this.isConnected = false;
    this.isConnecting = false;
    this.statusCb = null;

    // 从本地恢复
    try {
      const connected = !!uni.getStorageSync(STORAGE_KEYS.CONNECTED);
      const node = uni.getStorageSync(STORAGE_KEYS.ACTIVE_NODE);
      this.isConnected = connected && !!node;
    } catch (_) {}
  }

  async initialize() {
    if (this.isInitialized) return true;
    // 这里不做任何原生初始化，直接标记可用
    this.isInitialized = true;
    return true;
  }

  onStatusUpdate(cb) {
    this.statusCb = typeof cb === 'function' ? cb : null;
  }

  offStatusUpdate() {
    this.statusCb = null;
  }

  _emit(connected, message = '', state = '') {
    if (this.statusCb) {
      this.statusCb({
        connected: !!connected,
        isConnected: !!connected,
        status: state || (connected ? 'connected' : 'disconnected'),
        message: message || (connected ? '已连接' : '未连接')
      });
    }
  }

  getActiveNode() {
    try {
      return uni.getStorageSync(STORAGE_KEYS.ACTIVE_NODE) || null;
    } catch (_) {
      return null;
    }
  }

  getStatus() {
    return {
      connected: this.isConnected,
      isConnected: this.isConnected,
      status: this.isConnected ? 'connected' : 'disconnected',
      node: this.getActiveNode()
    };
  }

  async connect(node) {
    await this.initialize();

    if (this.isConnecting) {
      throw new Error('正在连接中，请稍候');
    }
    if (this.isConnected) {
      throw new Error('已连接，请先断开');
    }
    if (!node || !node.host || !node.port) {
      throw new Error('节点信息不完整（需要 host/port）');
    }

    // 这里只做“前端层面的连接生效”，把节点保存下来，供你在应用内的请求使用
    this.isConnecting = true;

    // 模拟连接耗时
    await new Promise(r => setTimeout(r, 500));

    // 标记为连接
    this.isConnecting = false;
    this.isConnected = true;

    try {
      uni.setStorageSync(STORAGE_KEYS.ACTIVE_NODE, {
        host: node.host,
        port: node.port,
        account: node.account || '',
        password: node.password || '',
        tag: node.tag || ''
      });
      uni.setStorageSync(STORAGE_KEYS.CONNECTED, true);
    } catch (_) {}

    this._emit(true, '连接成功', 'connected');

    // 这里不做任何真实网络代理配置。
    // **重要说明**：如果你要让应用内请求走代理，请让所有请求交给后端转发（后端通过 SOCKS5 出口）；
    // 前端只需在请求里带上当前节点（从 getActiveNode / storage 里取）或后端按用户选择进行路由。
    return { success: true, message: '连接成功（前端逻辑）' };
  }

  async disconnect() {
    if (!this.isConnected && !this.isConnecting) {
      return { success: true };
    }

    this.isConnecting = false;
    this.isConnected = false;

    try {
      uni.removeStorageSync(STORAGE_KEYS.CONNECTED);
      uni.removeStorageSync(STORAGE_KEYS.ACTIVE_NODE);
    } catch (_) {}

    this._emit(false, '已断开', 'disconnected');
    return { success: true, message: '已断开（前端逻辑）' };
  }
}

const androidVpnManager = new SimpleProxyManager();
export default androidVpnManager;


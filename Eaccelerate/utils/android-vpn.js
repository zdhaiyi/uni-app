// 安卓专用VPN功能
class AndroidVpnManager {
  constructor() {
    this.isConnected = false;
    this.statusCallback = null;
  }

  // 初始化VPN功能
  async initialize() {
    if (uni.getSystemInfoSync().platform !== 'android') {
      console.warn('VPN功能仅支持Android平台');
      return false;
    }
    return true;
  }

  // 启动VPN连接
  async connect(node) {
    return new Promise((resolve, reject) => {
      if (!this.isAndroid()) {
        reject(new Error('VPN功能仅支持Android平台'));
        return;
      }

      // 检查节点数据完整性
      if (!node.host || !node.port) {
        reject(new Error('节点信息不完整'));
        return;
      }

      // 使用账号密码，如果为空则使用默认值
      const username = node.account || 'anonymous';
      const password = node.password || 'password';

      uni.invokeNativePlugin('MyVpnPlugin', 'startVpn', {
        server: node.host,
        port: parseInt(node.port) || 1080,
        username: username,
        password: password
      }, (res) => {
        if (res.success) {
          this.isConnected = true;
          resolve(res);
        } else {
          this.isConnected = false;
          reject(new Error(res.message || 'VPN连接失败'));
        }
      });
    });
  }

  // 断开VPN连接
  async disconnect() {
    return new Promise((resolve, reject) => {
      if (!this.isAndroid()) {
        reject(new Error('VPN功能仅支持Android平台'));
        return;
      }

      uni.invokeNativePlugin('MyVpnPlugin', 'stopVpn', {}, (res) => {
        if (res.success) {
          this.isConnected = false;
          resolve(res);
        } else {
          reject(new Error(res.message || 'VPN断开失败'));
        }
      });
    });
  }

  // 监听VPN状态变化
  onStatusUpdate(callback) {
    this.statusCallback = callback;
    uni.invokeNativePlugin('MyVpnPlugin', 'onVpnStatusUpdate', {}, (res) => {
      if (this.statusCallback) {
        this.statusCallback(res);
      }
    });
  }

  // 检查VPN状态
  async getStatus() {
    return new Promise((resolve) => {
      if (!this.isAndroid()) {
        resolve({ isConnected: false, status: 'unsupported' });
        return;
      }

      uni.invokeNativePlugin('MyVpnPlugin', 'getVpnStatus', {}, (res) => {
        resolve(res);
      });
    });
  }

  // 检查是否是安卓平台
  isAndroid() {
    return uni.getSystemInfoSync().platform === 'android';
  }
}

// 创建单例实例
const androidVpnManager = new AndroidVpnManager();

export default androidVpnManager;
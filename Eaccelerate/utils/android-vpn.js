// utils/android-vpn.js - 兼容Vue3版本
class AndroidVpnManager {
    constructor() {
        this.isConnected = false;
        this.statusCallback = null;
        this.vpnPlugin = null;
        this.isInitialized = false;
    }

    // 初始化VPN功能
    async initialize() {
        if (this.isInitialized) return true;
        
        const systemInfo = uni.getSystemInfoSync();
        console.log("系统信息:", JSON.stringify(systemInfo));
        console.log("检测到的平台:", systemInfo.platform);

        // #ifdef APP-PLUS
        if (systemInfo.platform !== 'android') {
            console.warn('VPN功能仅支持Android平台，当前平台:', systemInfo.platform);
            this.isInitialized = true;
            return false;
        }

        try {
            // Vue3中使用requireNativePlugin
            if (typeof uni.requireNativePlugin === 'function') {
                this.vpnPlugin = uni.requireNativePlugin('MyVpnPlugin');
                console.log("VPN插件加载成功");
            } else {
                console.warn('requireNativePlugin不可用，使用模拟模式');
            }
            
            this.isInitialized = true;
            console.log("Android平台VPN功能初始化成功");
            return true;
        } catch (error) {
            console.error('VPN插件加载失败:', error);
            this.isInitialized = true; // 标记为已初始化，但使用模拟模式
            return false;
        }
        // #endif
        
        // #ifndef APP-PLUS
        console.warn('VPN功能仅支持APP平台');
        this.isInitialized = true;
        return false;
        // #endif
    }

    // 启动VPN连接
    async connect(node) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            // #ifdef APP-PLUS
            if (!this.isAndroid()) {
                throw new Error('VPN功能仅支持Android平台');
            }

            // 检查节点数据完整性
            if (!node.host || !node.port) {
                throw new Error('节点信息不完整');
            }

            const username = node.account || 'anonymous';
            const password = node.password || 'password';

            if (this.vpnPlugin && this.vpnPlugin.startVpn) {
                return new Promise((resolve, reject) => {
                    this.vpnPlugin.startVpn({
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
            } else {
                // 模拟连接（用于测试）
                return this.mockConnect(node);
            }
            // #endif
            
            // #ifndef APP-PLUS
            throw new Error('当前环境不支持原生插件调用');
            // #endif
        } catch (error) {
            console.error('VPN连接错误:', error);
            throw error;
        }
    }

    // 断开VPN连接
    async disconnect() {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            // #ifdef APP-PLUS
            if (!this.isAndroid()) {
                throw new Error('VPN功能仅支持Android平台');
            }

            if (this.vpnPlugin && this.vpnPlugin.stopVpn) {
                return new Promise((resolve, reject) => {
                    this.vpnPlugin.stopVpn({}, (res) => {
                        if (res.success) {
                            this.isConnected = false;
                            resolve(res);
                        } else {
                            reject(new Error(res.message || 'VPN断开失败'));
                        }
                    });
                });
            } else {
                // 模拟断开（用于测试）
                return this.mockDisconnect();
            }
            // #endif
            
            // #ifndef APP-PLUS
            throw new Error('当前环境不支持原生插件调用');
            // #endif
        } catch (error) {
            console.error('VPN断开错误:', error);
            throw error;
        }
    }

    // 监听VPN状态变化
    onStatusUpdate(callback) {
        this.statusCallback = callback;
        
        // #ifdef APP-PLUS
        if (this.vpnPlugin && this.vpnPlugin.onVpnStatusUpdate) {
            this.vpnPlugin.onVpnStatusUpdate({}, (res) => {
                if (this.statusCallback) {
                    this.statusCallback(res);
                }
            });
        } else {
            console.log('使用模拟状态更新');
            // 模拟状态更新
            setInterval(() => {
                if (this.statusCallback) {
                    this.statusCallback({
                        connected: this.isConnected,
                        status: this.isConnected ? 'connected' : 'disconnected',
                        message: this.isConnected ? 'VPN连接正常' : 'VPN未连接'
                    });
                }
            }, 5000);
        }
        // #endif
        
        // #ifndef APP-PLUS
        console.warn('状态更新功能仅支持APP平台');
        // #endif
    }

    // 检查VPN状态
    async getStatus() {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            // #ifdef APP-PLUS
            if (!this.isAndroid()) {
                return { isConnected: false, status: 'unsupported' };
            }

            if (this.vpnPlugin && this.vpnPlugin.getVpnStatus) {
                return new Promise((resolve) => {
                    this.vpnPlugin.getVpnStatus({}, (res) => {
                        resolve(res);
                    });
                });
            } else {
                // 返回模拟状态
                return {
                    isConnected: this.isConnected,
                    status: this.isConnected ? 'connected' : 'disconnected'
                };
            }
            // #endif
            
            // #ifndef APP-PLUS
            return { isConnected: false, status: 'unsupported' };
            // #endif
        } catch (error) {
            console.error('获取VPN状态错误:', error);
            return { isConnected: false, status: 'error' };
        }
    }

    // 检查是否是安卓平台
    isAndroid() {
        // #ifdef APP-PLUS
        return uni.getSystemInfoSync().platform === 'android';
        // #endif
        
        // #ifndef APP-PLUS
        return false;
        // #endif
    }

    // 模拟连接（用于测试）
    async mockConnect(node) {
        console.log('模拟VPN连接:', node);
        return new Promise((resolve) => {
            setTimeout(() => {
                this.isConnected = true;
                resolve({
                    success: true,
                    message: '模拟连接成功',
                    connected: true
                });
            }, 2000);
        });
    }

    // 模拟断开（用于测试）
    async mockDisconnect() {
        console.log('模拟VPN断开');
        return new Promise((resolve) => {
            setTimeout(() => {
                this.isConnected = false;
                resolve({
                    success: true,
                    message: '模拟断开成功',
                    connected: false
                });
            }, 1000);
        });
    }

    // 移除状态监听
    offStatusUpdate() {
        this.statusCallback = null;
    }
}

// 创建单例实例
const androidVpnManager = new AndroidVpnManager();

export default androidVpnManager;
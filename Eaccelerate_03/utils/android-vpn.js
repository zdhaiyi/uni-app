// 安卓专用VPN功能 - Vue2兼容版本
class AndroidVpnManager {
    constructor() {
        this.isConnected = false
        this.statusCallback = null
        this.vpnPlugin = null
        this.hasPermission = false
    }

    // 初始化VPN功能
    initialize() {
        return new Promise((resolve, reject) => {
            // #ifdef APP-PLUS
            const systemInfo = uni.getSystemInfoSync()
            console.log("检测到的平台:", systemInfo.platform)

            if (systemInfo.platform !== 'android') {
                console.warn('VPN功能仅支持Android平台')
                resolve(false)
                return
            }

            console.log("Android平台检测成功，开始初始化VPN功能")
            
            // Vue2兼容的原生插件调用方式
            if (typeof plus !== 'undefined' && plus.os.name === 'Android') {
                try {
                    // 使用HBuilderX提供的原生插件调用方式
                    this.vpnPlugin = uni.requireNativePlugin('MyVpnPlugin')
                    console.log('VPN插件加载成功')
                    
                    // 检查当前VPN状态
                    this.getStatus().then(status => {
                        this.isConnected = status.isConnected
                        resolve(true)
                    }).catch(error => {
                        console.error('检查VPN状态失败:', error)
                        resolve(true) // 仍然继续初始化
                    })
                    
                } catch (error) {
                    console.error('加载VPN插件失败:', error)
                    // 模拟模式，用于开发测试
                    console.log('启用模拟模式')
                    resolve(true)
                }
            } else {
                console.warn('当前环境不支持原生插件，启用模拟模式')
                resolve(true)
            }
            // #endif
            
            // #ifndef APP-PLUS
            console.warn('VPN功能仅支持APP平台，启用模拟模式')
            resolve(true)
            // #endif
        })
    }

    // 启动VPN连接
    connect(node) {
        return new Promise((resolve, reject) => {
            console.log('开始连接VPN，节点信息:', node)
            
            // #ifdef APP-PLUS
            if (this.vpnPlugin) {
                // 真实插件调用
                const options = {
                    server: node.host,
                    port: parseInt(node.port) || 1080,
                    username: node.account || '',
                    password: node.password || ''
                }
                
                console.log('调用原生插件连接VPN:', options)
                
                this.vpnPlugin.startVpn(options, (result) => {
                    console.log('VPN连接结果:', result)
                    if (result.success) {
                        this.isConnected = true
                        resolve(result)
                    } else {
                        this.isConnected = false
                        reject(new Error(result.message || 'VPN连接失败'))
                    }
                })
            } else {
                // 模拟连接成功
                console.log('使用模拟模式连接VPN')
                setTimeout(() => {
                    this.isConnected = true
                    resolve({
                        success: true,
                        message: '模拟连接成功'
                    })
                }, 2000)
            }
            // #endif
            
            // #ifndef APP-PLUS
            // 非APP平台模拟
            setTimeout(() => {
                this.isConnected = true
                resolve({
                    success: true,
                    message: '模拟连接成功'
                })
            }, 2000)
            // #endif
        })
    }

    // 断开VPN连接
    disconnect() {
        return new Promise((resolve, reject) => {
            console.log('断开VPN连接')
            
            // #ifdef APP-PLUS
            if (this.vpnPlugin) {
                this.vpnPlugin.stopVpn({}, (result) => {
                    console.log('VPN断开结果:', result)
                    if (result.success) {
                        this.isConnected = false
                        resolve(result)
                    } else {
                        reject(new Error(result.message || 'VPN断开失败'))
                    }
                })
            } else {
                // 模拟断开
                setTimeout(() => {
                    this.isConnected = false
                    resolve({
                        success: true,
                        message: '模拟断开成功'
                    })
                }, 1000)
            }
            // #endif
            
            // #ifndef APP-PLUS
            setTimeout(() => {
                this.isConnected = false
                resolve({
                    success: true,
                    message: '模拟断开成功'
                })
            }, 1000)
            // #endif
        })
    }

    // 监听VPN状态变化
    onStatusUpdate(callback) {
        this.statusCallback = callback
        console.log('注册VPN状态监听')
        
        // #ifdef APP-PLUS
        if (this.vpnPlugin) {
            this.vpnPlugin.onVpnStatusUpdate({}, (result) => {
                console.log('VPN状态更新:', result)
                this.isConnected = result.connected
                if (this.statusCallback) {
                    this.statusCallback(result)
                }
            })
        }
        // #endif
    }

    // 检查VPN状态
    getStatus() {
        return new Promise((resolve) => {
            // #ifdef APP-PLUS
            if (this.vpnPlugin) {
                this.vpnPlugin.getVpnStatus({}, (result) => {
                    this.isConnected = result.isConnected
                    resolve(result)
                })
            } else {
                resolve({ 
                    isConnected: this.isConnected, 
                    status: this.isConnected ? 'connected' : 'disconnected',
                    message: this.isConnected ? 'VPN已连接' : 'VPN未连接'
                })
            }
            // #endif
            
            // #ifndef APP-PLUS
            resolve({ 
                isConnected: this.isConnected, 
                status: this.isConnected ? 'connected' : 'disconnected',
                message: this.isConnected ? 'VPN已连接' : 'VPN未连接'
            })
            // #endif
        })
    }
}

// 创建单例实例
const androidVpnManager = new AndroidVpnManager()

export default androidVpnManager
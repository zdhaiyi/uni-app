// utils/android-vpn.js - 优化版本
class AndroidVpnManager {
	constructor() {
		this.isConnected = false;
		this.isConnecting = false;
		this.statusCallback = null;
		this.vpnPlugin = null;
		this.isInitialized = false;
		this.connectionState = 'disconnected';
		this.lastStatus = null;
		this.retryCount = 0;
		this.maxRetries = 3;
	}

	// 添加插件状态检查方法
	checkPluginAvailability() {
		return new Promise((resolve) => {
			try {
				// #ifdef APP-PLUS
				if (typeof uni.requireNativePlugin !== 'function') {
					resolve(false);
					return;
				}

				const plugin = uni.requireNativePlugin('MyVpnPlugin');
				resolve(!!plugin);
				// #endif

				// #ifndef APP-PLUS
				resolve(false);
				// #endif
			} catch (error) {
				console.error('检查插件可用性失败:', error);
				resolve(false);
			}
		});
	}

	async diagnosePlugin() {
		console.log('=== VPN插件诊断 ===');

		// 检查运行环境
		const systemInfo = uni.getSystemInfoSync();
		console.log('运行平台:', systemInfo.platform);
		console.log('应用版本:', systemInfo.appVersion);

		// 检查 requireNativePlugin 可用性
		console.log('requireNativePlugin 类型:', typeof uni.requireNativePlugin);

		// 尝试加载插件
		try {
			const plugin = uni.requireNativePlugin('MyVpnPlugin');
			console.log('插件加载结果:', plugin ? '成功' : '失败');
			console.log('插件对象类型:', typeof plugin);

			if (plugin) {
				// 检查方法
				const methods = ['startVpn', 'stopVpn', 'getVpnStatus', 'onVpnStatusUpdate'];
				methods.forEach(method => {
					console.log(`${method} 方法:`, typeof plugin[method] === 'function' ? '存在' : '缺失');
				});
			}
		} catch (error) {
			console.log('插件加载异常:', error.message);
		}

		console.log('=== 诊断结束 ===');
	}
	
	// 添加插件验证方法
	async verifyPlugin() {
	    console.log('=== 验证插件可用性 ===');
	    
	    try {
	        // 检查运行环境
	        const systemInfo = uni.getSystemInfoSync();
	        console.log('运行平台:', systemInfo.platform);
	        
	        if (systemInfo.platform !== 'android') {
	            console.log('非Android平台，跳过插件验证');
	            return false;
	        }
	        
	        // 检查 requireNativePlugin 是否可用
	        if (typeof uni.requireNativePlugin !== 'function') {
	            console.error('requireNativePlugin 不可用');
	            return false;
	        }
	        
	        // 尝试加载插件
	        console.log('尝试加载插件...');
	        const plugin = uni.requireNativePlugin('MyVpnPlugin');
	        console.log('插件加载结果:', plugin);
	        
	        if (!plugin) {
	            console.error('插件加载返回 null');
	            return false;
	        }
	        
	        // 检查插件方法
	        const methods = ['startVpn', 'stopVpn', 'getVpnStatus', 'onVpnStatusUpdate'];
	        let allMethodsExist = true;
	        
	        methods.forEach(method => {
	            const exists = typeof plugin[method] === 'function';
	            console.log(`方法 ${method}: ${exists ? '存在' : '缺失'}`);
	            if (!exists) allMethodsExist = false;
	        });
	        
	        console.log('插件验证结果:', allMethodsExist ? '通过' : '失败');
	        return allMethodsExist;
	        
	    } catch (error) {
	        console.error('插件验证异常:', error);
	        return false;
	    }
	}


	// 初始化VPN功能
	async initialize() {
		if (this.isInitialized) {
			console.log("VPN功能已初始化");
			return this.pluginAvailable;
		}
		// 运行诊断
		await this.diagnosePlugin();
		console.log("开始初始化VPN功能");
		// 先验证插件
		    this.pluginAvailable = await this.verifyPlugin();
		    console.log("插件可用状态:", this.pluginAvailable);

		try {
			// #ifdef APP-PLUS
			const systemInfo = uni.getSystemInfoSync();
			console.log("系统平台:", systemInfo.platform);

			if (systemInfo.platform !== 'android') {
				console.warn('VPN功能仅支持Android平台');
				this.isInitialized = true;
				this.pluginAvailable = false;
				return false;
			}

			// 检查 uni.requireNativePlugin 是否可用
			if (typeof uni.requireNativePlugin !== 'function') {
				console.error('requireNativePlugin 方法不可用');
				this.isInitialized = true;
				this.pluginAvailable = false;
				return false;
			}

			// 尝试加载插件
			try {
				this.vpnPlugin = uni.requireNativePlugin('MyVpnPlugin');
				if (!this.vpnPlugin) {
					throw new Error('插件加载返回null');
				}

				// 检查插件方法是否存在
				if (typeof this.vpnPlugin.startVpn !== 'function' ||
					typeof this.vpnPlugin.stopVpn !== 'function') {
					console.error('VPN插件方法不完整');
					this.pluginAvailable = false;
				} else {
					this.pluginAvailable = true;
					console.log("VPN插件加载成功，方法检查通过");
				}
			} catch (pluginError) {
				console.error('加载VPN插件失败:', pluginError);
				this.pluginAvailable = false;
			}

			// 设置状态监听（仅在插件可用时）
			if (this.pluginAvailable) {
				await this.setupStatusListener();
			}

			this.isInitialized = true;
			console.log("VPN功能初始化完成，插件可用状态:", this.pluginAvailable);
			return this.pluginAvailable;
			// #endif

			// #ifndef APP-PLUS
			console.warn('非APP平台，使用模拟模式');
			this.isInitialized = true;
			this.pluginAvailable = false;
			return false;
			// #endif

		} catch (error) {
			console.error('VPN初始化异常:', error);
			this.isInitialized = true;
			this.pluginAvailable = false;
			return false;
		}
	}

	// 设置状态监听
	async setupStatusListener() {
		if (!this.vpnPlugin || typeof this.vpnPlugin.onVpnStatusUpdate !== 'function') {
			console.warn('VPN插件不支持状态监听，使用模拟模式');
			return;
		}

		return new Promise((resolve) => {
			try {
				this.vpnPlugin.onVpnStatusUpdate({}, (result) => {
					console.log('收到原生VPN状态更新:', JSON.stringify(result));
					this.handleNativeStatusUpdate(result);
				});
				console.log('VPN状态监听注册成功');
				resolve(true);
			} catch (error) {
				console.error('注册状态监听失败:', error);
				resolve(false);
			}
		});
	}

	// 处理原生状态更新
	handleNativeStatusUpdate(result) {
		if (!result || typeof result !== 'object') {
			console.warn('无效的状态更新数据');
			return;
		}

		const connected = !!result.connected || !!result.isConnected;
		const message = result.message || '状态更新';
		const status = result.status || (connected ? 'connected' : 'disconnected');

		this.lastStatus = result;
		this.isConnected = connected;
		this.isConnecting = false;
		this.connectionState = status;

		console.log('处理VPN状态更新:', {
			connected,
			status,
			message
		});

		// 重置重试计数
		if (connected) {
			this.retryCount = 0;
		}

		// 触发回调
		if (this.statusCallback) {
			const statusInfo = {
				connected: connected,
				isConnected: connected,
				status: status,
				message: message,
				timestamp: result.timestamp || Date.now(),
				success: result.success !== false
			};
			this.statusCallback(statusInfo);
		}
	}

	// 启动VPN连接
	async connect(node) {
		try {
			if (!this.isInitialized) {
				await this.initialize();
			}

			// 详细检查插件状态
			if (!this.pluginAvailable) {
				let errorMsg = 'VPN插件不可用 - ';

				if (!this.vpnPlugin) {
					errorMsg += '插件对象为null';
				} else if (typeof this.vpnPlugin.startVpn !== 'function') {
					errorMsg += 'startVpn方法不存在';
				} else {
					errorMsg += '未知原因';
				}

				console.warn(errorMsg + '，使用模拟模式');
				return this.mockConnect(node);
			}

			// 原有的连接逻辑...
			if (this.isConnecting) {
				throw new Error('VPN连接正在进行中');
			}

			if (this.isConnected) {
				throw new Error('VPN已连接，请先断开');
			}

			// 验证节点信息
			if (!node || !node.host || !node.port) {
				throw new Error('节点信息不完整');
			}

			console.log('开始连接VPN，服务器:', node.host + ':' + node.port);

			this.isConnecting = true;
			this.connectionState = 'connecting';

			return new Promise((resolve, reject) => {
				const connectionParams = {
					server: node.host,
					port: parseInt(node.port) || 1080,
					username: node.account || 'default',
					password: node.password || 'default'
				};

				console.log('调用原生连接方法:', connectionParams);

				// 添加超时机制
				const timeoutId = setTimeout(() => {
					reject(new Error('VPN连接超时（30秒）'));
				}, 30000);

				this.vpnPlugin.startVpn(connectionParams, (result) => {
					clearTimeout(timeoutId);
					console.log('原生连接回调:', JSON.stringify(result));

					this.isConnecting = false;

					if (result && result.success) {
						this.isConnected = true;
						this.connectionState = 'connected';
						resolve(result);
					} else {
						const errorMsg = result ? result.message : '连接失败，无返回结果';
						this.isConnected = false;
						this.connectionState = 'disconnected';
						reject(new Error(errorMsg));
					}
				});
			});

		} catch (error) {
			this.isConnecting = false;
			this.isConnected = false;
			this.connectionState = 'error';
			console.error('VPN连接错误:', error);
			throw error;
		}
	}

	// 处理连接错误
	handleConnectionError(errorMsg, reject) {
		this.isConnecting = false;
		this.isConnected = false;
		this.connectionState = 'error';

		console.error('VPN连接错误:', errorMsg);

		// 触发错误状态更新
		this.triggerStatusUpdate(false, errorMsg, 'error');

		if (reject) {
			reject(new Error(errorMsg));
		}
	}

	// 断开VPN连接
	async disconnect() {
		console.log('开始断开VPN连接');

		try {
			if (!this.isConnected && !this.isConnecting) {
				console.log('VPN未连接，无需断开');
				return {
					success: true,
					message: 'VPN未连接',
					wasConnected: false
				};
			}

			// 立即更新状态
			this.triggerStatusUpdate(false, '正在断开连接...', 'disconnecting');

			// #ifdef APP-PLUS
			if (!this.vpnPlugin) {
				throw new Error('VPN插件未初始化');
			}

			return new Promise((resolve, reject) => {
				this.vpnPlugin.stopVpn({}, (result) => {
					console.log('原生断开回调:', JSON.stringify(result));

					this.isConnecting = false;

					if (result && result.success) {
						console.log('VPN断开指令发送成功');
						resolve({
							success: true,
							message: 'VPN断开指令已发送',
							wasConnected: true
						});
					} else {
						const errorMsg = result ? result.message : '断开失败';
						this.handleDisconnectionError(errorMsg, reject);
					}
				});
			});
			// #endif

			// #ifndef APP-PLUS
			console.log('非APP平台，使用模拟断开');
			return this.mockDisconnect();
			// #endif

		} catch (error) {
			this.handleDisconnectionError(error.message, () => {
				throw error;
			});
		}
	}

	// 处理断开错误
	handleDisconnectionError(errorMsg, reject) {
		console.error('VPN断开错误:', errorMsg);

		// 强制更新状态为断开
		this.isConnected = false;
		this.isConnecting = false;
		this.connectionState = 'disconnected';

		this.triggerStatusUpdate(false, errorMsg, 'error');

		if (reject) {
			reject(new Error(errorMsg));
		}
	}

	// 监听状态变化
	onStatusUpdate(callback) {
		console.log('注册状态更新回调');
		this.statusCallback = callback;

		// 立即发送当前状态
		if (this.statusCallback) {
			this.triggerStatusUpdate(this.isConnected,
				this.isConnected ? '已连接' : '未连接',
				this.connectionState);
		}
	}

	// 触发状态更新
	triggerStatusUpdate(connected, message, status = null) {
		const statusInfo = {
			connected: connected,
			isConnected: connected,
			status: status || (connected ? 'connected' : 'disconnected'),
			message: message,
			timestamp: Date.now()
		};

		console.log('触发状态更新:', statusInfo);

		if (this.statusCallback) {
			this.statusCallback(statusInfo);
		}
	}

	// 移除状态监听
	offStatusUpdate() {
		console.log('移除状态监听');
		this.statusCallback = null;
	}

	// 获取当前状态
	async getStatus() {
		try {
			if (!this.isInitialized) {
				await this.initialize();
			}

			// #ifdef APP-PLUS
			if (this.vpnPlugin && typeof this.vpnPlugin.getVpnStatus === 'function') {
				return new Promise((resolve) => {
					this.vpnPlugin.getVpnStatus({}, (result) => {
						console.log('获取VPN状态结果:', JSON.stringify(result));
						if (result) {
							this.handleNativeStatusUpdate(result);
						}
						resolve(result || {
							isConnected: this.isConnected,
							connected: this.isConnected,
							status: this.connectionState,
							message: '状态查询完成',
							success: true
						});
					});
				});
			}
			// #endif

			return {
				isConnected: this.isConnected,
				connected: this.isConnected,
				status: this.connectionState,
				message: '当前状态',
				success: true
			};
		} catch (error) {
			console.error('获取状态错误:', error);
			return {
				isConnected: false,
				connected: false,
				status: 'error',
				message: error.message,
				success: false
			};
		}
	}

	// 获取连接状态摘要
	getConnectionSummary() {
		return {
			isConnected: this.isConnected,
			isConnecting: this.isConnecting,
			connectionState: this.connectionState,
			lastStatus: this.lastStatus
		};
	}

	// 模拟连接（测试用）
	async mockConnect(node) {
		console.log('模拟VPN连接:', node.host);
		return new Promise((resolve) => {
			setTimeout(() => {
				this.isConnecting = false;
				this.isConnected = true;
				this.connectionState = 'connected';

				this.triggerStatusUpdate(true, '模拟连接成功', 'connected');

				resolve({
					success: true,
					message: '模拟连接成功'
				});
			}, 2000);
		});
	}

	// 模拟断开（测试用）
	async mockDisconnect() {
		console.log('模拟VPN断开');
		return new Promise((resolve) => {
			setTimeout(() => {
				this.isConnected = false;
				this.connectionState = 'disconnected';

				this.triggerStatusUpdate(false, '模拟断开成功', 'disconnected');

				resolve({
					success: true,
					message: '模拟断开成功',
					wasConnected: true
				});
			}, 1000);
		});
	}
}

// 创建单例实例
const androidVpnManager = new AndroidVpnManager();

export default androidVpnManager;
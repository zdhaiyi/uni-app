// utils/android-vpn.js
// 封装原生插件调用 + 详细日志（建议直接替换）
//
// 日志查看：HBuilderX -> 运行 -> 运行到手机或模拟器 -> 运行日志

const DEBUG = true;
const LG = (...a) => {
	if (DEBUG) console.log('[VPN-JS]', ...a);
};
const LGE = (...a) => {
	if (DEBUG) console.error('[VPN-JS]', ...a);
};

function mask(str = '') {
	if (!str) return '';
	if (str.length <= 2) return '*'.repeat(str.length);
	return str[0] + '*'.repeat(str.length - 2) + str[str.length - 1];
}

class AndroidVpnManager {
	constructor() {
		this.vpn = null; // 原生插件对象
		this.available = false; // 插件是否可用
		this.inited = false;

		this.isConnecting = false;
		this.isConnected = false;
		this.statusCb = null;

		this._heartbeat = null; // 模拟模式心跳
		this._watchdog = null; // 连接看门狗
	}

	_emit(status) {
		LG('状态派发 _emit =>', status);
		try {
			if (typeof this.statusCb === 'function') this.statusCb(status || {});
		} catch (e) {
			LGE('状态回调异常:', e);
		}
	}

	onStatusUpdate(cb) {
		this.statusCb = cb;
	}
	offStatusUpdate() {
		this.statusCb = null;
	}

	async initialize() {
		if (this.inited) {
			LG('initialize: 已初始化，available=', this.available);
			return this.available;
		}

		// #ifdef APP-PLUS
		try {
			const sys = uni.getSystemInfoSync();
			LG('initialize: 平台=', sys.platform, '系统版本=', sys.system, 'appVersion=', sys.appVersion);

			if (sys.platform !== 'android') {
				LG('非 Android 平台，跳过原生插件');
				this.available = false;
				this.inited = true;
				return false;
			}
			if (typeof uni.requireNativePlugin !== 'function') {
				LG('requireNativePlugin 不可用');
				this.available = false;
				this.inited = true;
				return false;
			}

			// 名称要与 nativeplugins/MyVpnPlugin 的 package.json & dcloud_uniplugins.json 一致
			this.vpn = uni.requireNativePlugin('MyVpnPlugin');
			LG('initialize: requireNativePlugin(MyVpnPlugin) =>', !!this.vpn ? 'OK' : 'NULL');
			this.available = !!this.vpn;

			if (this.available && typeof this.vpn.onVpnStatusUpdate === 'function') {
				LG('initialize: 注册 onVpnStatusUpdate 回调');
				this.vpn.onVpnStatusUpdate((s) => {
					LG('onVpnStatusUpdate 回调 =>', s);
					const connected = !!(s && (s.connected || s.isConnected));
					this.isConnected = connected;
					this.isConnecting = false;
					this._emit({
						connected,
						status: connected ? 'connected' : 'disconnected',
						message: (s && (s.message || s.msg)) || (connected ? '已连接' : '未连接')
					});
				});
			} else if (!this.available) {
				LG('未加载到原生插件，将使用模拟模式');
			} else {
				LG('原生插件不提供 onVpnStatusUpdate（没关系，走轮询逻辑）');
			}
		} catch (e) {
			LGE('初始化异常：', e);
			this.available = false;
		}
		this.inited = true;
		LG('initialize 完成，available=', this.available);
		return this.available;
		// #endif

		// #ifndef APP-PLUS
		LG('H5/小程序环境：无原生插件');
		this.available = false;
		this.inited = true;
		return false;
		// #endif
	}

	async syncStatus() {
		LG('syncStatus: 开始');
		const s = await this.getStatus();
		this.isConnected = !!s.connected;
		this.isConnecting = false;
		this._emit({
			connected: this.isConnected,
			status: this.isConnected ? 'connected' : 'disconnected',
			message: s.message || (this.isConnected ? '已连接' : '未连接')
		});
		LG('syncStatus: 同步结束 =>', s);
		return s;
	}

	async getStatus() {
		LG('getStatus: 调用');
		if (!this.inited) await this.initialize();

		// #ifdef APP-PLUS
		if (this.available && this.vpn) {
			try {
				if (typeof this.vpn.getVpnStatus === 'function' && this.vpn.getVpnStatus.length === 0) {
					const s = this.vpn.getVpnStatus();
					LG('getStatus: 同步返回 =>', s);
					const connected = !!(s && (s.connected || s.isConnected));
					return {
						connected,
						status: connected ? 'connected' : 'disconnected',
						message: (s && (s.message || s.msg)) || (connected ? '已连接' : '未连接')
					};
				}
				if (typeof this.vpn.getVpnStatus === 'function') {
					LG('getStatus: 走回调式');
					return await new Promise((resolve) => {
						try {
							this.vpn.getVpnStatus((s) => {
								LG('getStatus callback =>', s);
								const connected = !!(s && (s.connected || s.isConnected));
								resolve({
									connected,
									status: connected ? 'connected' : 'disconnected',
									message: (s && (s.message || s.msg)) || (connected ?
										'已连接' : '未连接')
								});
							});
						} catch (e) {
							LGE('getStatus 回调异常：', e);
							resolve({
								connected: false,
								status: 'disconnected',
								message: '未连接'
							});
						}
					});
				}
			} catch (e) {
				LGE('getStatus 异常：', e);
			}
		}
		// #endif

		LG('getStatus: 无原生或异常，退回本地标志 =>', {
			isConnected: this.isConnected,
			isConnecting: this.isConnecting
		});
		return {
			connected: this.isConnected,
			status: this.isConnected ? 'connected' : (this.isConnecting ? 'connecting' : 'disconnected'),
			message: this.isConnected ? '已连接' : '未连接'
		};
	}

	_pollUntilConnected(ms = 15000) {
		LG('_pollUntilConnected: 开始，超时(ms)=', ms);
		const start = Date.now();
		return new Promise((resolve, reject) => {
			const tick = async () => {
				const s = await this.getStatus();
				LG('_pollUntilConnected: tick =>', s);
				if (s.connected) return resolve(s);
				if (Date.now() - start > ms) return reject(new Error('连接超时'));
				setTimeout(tick, 800);
			};
			tick();
		});
	}

	async connect(node) {
		LG('connect: 入参节点 =>', {
			host: node && node.host,
			port: node && node.port,
			account: node && mask(node.account),
			password: node && mask(node.password),
			status: node && node.status,
			expire: node && node.expire
		});

		const t0 = Date.now();
		if (!this.inited) await this.initialize();

		if (!node || !node.host || !node.port) {
			LGE('connect: 节点信息不完整');
			throw new Error('节点信息不完整');
		}
		if (this.isConnecting) {
			LGE('connect: 正在连接中');
			throw new Error('连接中，请稍候');
		}

		// 先与原生同步一次，避免“JS 误判”
		const real = await this.syncStatus();
		if (real.connected) {
			LGE('connect: 原生已连接，直接报错阻止重复连接');
			throw new Error('已连接，请先断开');
		}

		if (this.isConnected) {
			LGE('connect: JS 标志已连接（通常不会发生，已在上一步同步），阻止继续');
			throw new Error('已连接，请先断开');
		}

		const params = {
			proxyType: 'socks5',
			server: node.host,
			port: parseInt(node.port, 10) || 1080,
			username: node.account || '',
			password: node.password || '',
			authType: (node.account && node.password) ? 'password' : 'none'
		};
		LG('connect: 组装参数 =>', {
			...params,
			password: mask(params.password)
		});

		this.isConnecting = true;
		this._emit({
			connected: false,
			status: 'connecting',
			message: '连接中...'
		});

		// #ifdef APP-PLUS
		if (this.available && this.vpn && typeof this.vpn.startVpn === 'function') {
			LG('connect: 调用原生 startVpn');
			// 看门狗
			const watchdog = new Promise((_, reject) => {
				this._watchdog = setTimeout(() => {
					LGE('connect: 看门狗触发（30s），判定超时');
					this.isConnecting = false;
					this._emit({
						connected: false,
						status: 'error',
						message: '连接超时'
					});
					reject(new Error('连接超时'));
				}, 30000);
			});

			const cbPromise = new Promise((resolve, reject) => {
				try {
					if (this.vpn.startVpn.length >= 2) {
						LG('connect: startVpn 使用 回调模式');
						this.vpn.startVpn(params, (ret) => {
							LG('connect: startVpn 回调 =>', ret);
							const ok = !!(ret && ret.success);
							this.isConnecting = false;
							this.isConnected = ok;
							clearTimeout(this._watchdog);
							this._emit({
								connected: ok,
								status: ok ? 'connected' : 'error',
								message: (ret && ret.message) || (ok ? '连接成功' : '连接失败')
							});
							ok ? resolve(ret) : reject(new Error((ret && ret.message) || '连接失败'));
						});
					} else {
						LG('connect: startVpn 无回调，先调用再轮询');
						this.vpn.startVpn(params);
						resolve(null);
					}
				} catch (e) {
					clearTimeout(this._watchdog);
					this.isConnecting = false;
					this.isConnected = false;
					this._emit({
						connected: false,
						status: 'error',
						message: e.message || '连接异常'
					});
					reject(e);
				}
			});

			const pollPromise = this._pollUntilConnected(15000);

			const result = await Promise.race([cbPromise.then(() => this.getStatus()), pollPromise, watchdog]);
			LG('connect: 首个完成的结果 =>', result);
			clearTimeout(this._watchdog);

			const finalStatus = await this.getStatus();
			LG('connect: 最终状态 =>', finalStatus);
			this.isConnected = !!finalStatus.connected;
			this.isConnecting = false;
			this._emit({
				connected: this.isConnected,
				status: this.isConnected ? 'connected' : 'disconnected',
				message: finalStatus.message || (this.isConnected ? '连接成功' : '连接失败')
			});

			const cost = Date.now() - t0;
			LG(`connect: 结束，耗时 ${cost}ms，connected=${this.isConnected}`);
			if (!this.isConnected) throw new Error(finalStatus.message || '连接失败');
			return {
				success: true,
				message: finalStatus.message || '连接成功'
			};
		}
		// #endif

		LG('connect: 无原生插件，进入模拟模式');
		return await this._mockConnect();
	}

	async disconnect() {
		LG('disconnect: 调用');
		// #ifdef APP-PLUS
		if (this.available && this.vpn && typeof this.vpn.stopVpn === 'function') {
			return await new Promise((resolve) => {
				try {
					this.vpn.stopVpn((ret) => {
						LG('disconnect: stopVpn 回调 =>', ret);
						this.isConnected = false;
						this.isConnecting = false;
						this._emit({
							connected: false,
							status: 'disconnected',
							message: (ret && ret.message) || '已断开'
						});
						resolve(ret || {
							success: true
						});
					});
				} catch (e) {
					LGE('disconnect: stopVpn 异常 =>', e);
					this.isConnected = false;
					this.isConnecting = false;
					this._emit({
						connected: false,
						status: 'disconnected',
						message: '已断开'
					});
					resolve({
						success: true
					});
				}
			});
		}
		// #endif

		// 模拟
		clearInterval(this._heartbeat);
		this._heartbeat = null;
		this.isConnected = false;
		this.isConnecting = false;
		this._emit({
			connected: false,
			status: 'disconnected',
			message: '已断开（模拟）'
		});
		return {
			success: true
		};
	}

	async forceDisconnect(force = true) {
		LG('forceDisconnect: 调用，force=', force);
		try {
			if (force) {
				// #ifdef APP-PLUS
				if (this.vpn && typeof this.vpn.stopVpn === 'function') {
					try {
						await new Promise((resolve) => {
							try {
								this.vpn.stopVpn(() => {
									LG('forceDisconnect: stopVpn 完成');
									resolve();
								});
							} catch (e) {
								LG('forceDisconnect: stopVpn 捕获异常但继续', e);
								resolve();
							}
						});
					} catch (e) {
						LG('forceDisconnect: 外层异常忽略', e);
					}
				}
				// #endif
			} else {
				await this.disconnect();
			}
		} catch (e) {
			LG('forceDisconnect: 异常忽略', e);
		}
		this.hardReset();
	}

	hardReset() {
		LG('hardReset: 本地状态复位');
		clearInterval(this._heartbeat);
		this._heartbeat = null;
		clearTimeout(this._watchdog);
		this._watchdog = null;
		this.isConnected = false;
		this.isConnecting = false;
		this._emit({
			connected: false,
			status: 'disconnected',
			message: '已断开'
		});
	}

	async _mockConnect() {
		LG('_mockConnect: 开始');
		return await new Promise((resolve) => {
			setTimeout(() => {
				this.isConnecting = false;
				this.isConnected = true;
				this._emit({
					connected: true,
					status: 'connected',
					message: '模拟连接成功'
				});
				clearInterval(this._heartbeat);
				this._heartbeat = setInterval(() => {
					if (this.isConnected) this._emit({
						connected: true,
						status: 'connected',
						message: '模拟运行中'
					});
				}, 3000);
				LG('_mockConnect: 完成 => connected=true');
				resolve({
					success: true,
					message: '模拟连接成功'
				});
			}, 1000);
		});
	}
}

const mgr = new AndroidVpnManager();
export default mgr;
<template>
	<view class="container">
		<!-- 头部：登录状态 -->
		<view class="header">
			<view class="user-info">
				<text class="welcome-text" v-if="isLoggedIn">欢迎, {{ username }}</text>
				<text class="welcome-text" v-else>请先登录</text>
				<button class="btn-auth" @click="handleAuth">
					{{ isLoggedIn ? '退出登录' : '登录' }}
				</button>
			</view>
		</view>

		<!-- VPN状态卡片 -->
		<view class="vpn-status-card">
			<view class="status-header">
				<view class="status-indicator" :class="statusClass"></view>
				<text class="status-text">{{ statusText }}</text>
			</view>
			<view class="connection-info">{{ connectionInfo }}</view>
			<view class="connection-time">{{ connectionTime }}</view>
			<button class="btn-connect" :class="{connecting: isConnecting}" @click="toggleVPN"
				:disabled="!isLoggedIn || nodes.length === 0 || selectedIndex === null">
				{{ connectButtonText }}
			</button>
		</view>

		<!-- 节点列表 -->
		<view class="section">
			<view class="section-header">
				<text class="section-title">节点列表</text>
				<view class="section-action" @click="refreshNodes">
					<text class="refresh-text">刷新</text>
					<uni-icons type="refresh" size="16" color="#4361ee"></uni-icons>
				</view>
			</view>

			<view class="nodes-stats">
				<text class="stats-text">可用节点: {{ availableNodes.length }}/{{ nodes.length }}</text>
			</view>

			<scroll-view class="node-list" scroll-y>
				<view v-for="(n, i) in nodes" :key="n._id || i" class="node-item" :class="{
            selected: selectedIndex===i,
            offline: !n.status || isExpired(n),
            'no-auth': false
          }" @click="selectNode(i)">
					<view class="node-info">
						<view class="node-details">
							<text class="node-name">{{ n.tag }}</text>
							<view class="node-meta">
								<text class="node-location">{{ n.host }}:{{ n.port }}</text>
								<text class="node-expire">{{ formatExpire(n.expire) }}</text>
							</view>
						</view>
					</view>

					<view class="node-status">
						<view class="status-indicators">
							<text :class="n.status ? 'status-online' : 'status-offline'">
								{{ n.status ? '在线' : '离线' }}
							</text>
							<text class="status-noauth">
								{{ (n.account && n.password) ? '需认证' : '免认证' }}
							</text>
						</view>
						<view v-if="selectedIndex === i" class="selected-indicator">
							<uni-icons type="checkmark" size="16" color="#4361ee"></uni-icons>
						</view>
					</view>
				</view>

				<view v-if="nodes.length === 0" class="empty-state">
					<text>暂无节点数据，请先登录或刷新</text>
				</view>
			</scroll-view>
		</view>

		<!-- 使用提示 -->
		<view class="section tips-section">
			<view class="section-header">
				<text class="section-title">使用提示</text>
			</view>
			<view class="tips-content">
				<text class="tip-item">• 节点“免认证”说明可直接连接（SOCKS5 无认证）</text>
				<text class="tip-item">• 首次连接会弹出 VPN 许可对话框，请允许</text>
				<text class="tip-item">• 连接后可切到后台，服务会常驻</text>
			</view>
		</view>
	</view>
</template>

<script setup>
	import {
		ref,
		computed,
		onMounted,
		onUnmounted
	} from 'vue'
	import androidVpn from '@/utils/android-vpn.js'

	const LG = (...a) => console.log('[PAGE]', ...a);
	const LGE = (...a) => console.error('[PAGE]', ...a);

	// 登录状态
	const isLoggedIn = ref(false)
	const username = ref('')
	const token = ref('')

	// 状态显示
	const isConnected = ref(false)
	const isConnecting = ref(false)
	const statusText = ref('未连接')
	const connectionInfo = ref('--')
	const connectionTime = ref('--')
	const connectButtonText = ref('连接VPN')

	// 节点
	const nodes = ref([])
	const selectedIndex = ref(null)
	const page = ref(1)
	const pageSize = ref(20)
	const isLoading = ref(false)
	let timer = null

	const availableNodes = computed(() =>
		nodes.value.filter(n => n.status && !isExpired(n))
	)

	const statusClass = computed(() => {
		if (isConnected.value) return 'connected'
		if (isConnecting.value) return 'connecting'
		return 'disconnected'
	})

	onMounted(async () => {
		LG('mounted: 开始');
		checkLogin()
		await androidVpn.initialize()
		androidVpn.onStatusUpdate(handleVpnStatus)

		const s = await androidVpn.syncStatus()
		LG('mounted: syncStatus =>', s)
		isConnected.value = !!s.connected
		isConnecting.value = false
		statusText.value = s.message || (s.connected ? '已连接' : '未连接')
		connectButtonText.value = s.connected ? '断开连接' : '连接VPN'

		if (isLoggedIn.value) refreshNodes()
	})

	onUnmounted(() => {
		LG('unmounted: 解绑回调 & 清计时器');
		androidVpn.offStatusUpdate()
		if (timer) {
			clearInterval(timer);
			timer = null
		}
	})

	function checkLogin() {
		const t = uni.getStorageSync('token')
		const u = uni.getStorageSync('username')
		isLoggedIn.value = !!(t && u)
		token.value = t || ''
		username.value = u || ''
		LG('checkLogin:', {
			isLoggedIn: isLoggedIn.value,
			username: username.value
		})
	}

	async function refreshNodes() {
		if (!isLoggedIn.value) {
			uni.showToast({
				title: '请先登录',
				icon: 'none'
			})
			LG('refreshNodes: 未登录，取消请求');
			return
		}
		if (isLoading.value) {
			LG('refreshNodes: 正在加载中，忽略');
			return
		}
		isLoading.value = true
		uni.showLoading({
			title: '获取节点中...'
		})
		LG('refreshNodes: 发起请求', {
			page: page.value,
			pageSize: pageSize.value
		})

		try {
			const res = await uni.request({
				url: 'http://124.223.21.69/api/nodes',
				method: 'GET',
				data: {
					page: page.value,
					pageSize: pageSize.value
				},
				header: {
					'Authorization': 'Bearer ' + token.value
				}
			})
			LG('refreshNodes: 响应 status=', res.statusCode, 'data=', res.data)

			let arr = []
			if (Array.isArray(res.data)) arr = res.data
			else if (res.data && Array.isArray(res.data.nodes)) arr = res.data.nodes
			else if (res.data && Array.isArray(res.data.data)) arr = res.data.data

			nodes.value = (arr || []).map(x => ({
				...x
			}))
			LG('refreshNodes: 处理后的节点数=', nodes.value.length)
			nodes.value.slice(0, 5).forEach((n, i) => {
				LG(`  节点[${i}]`, {
					tag: n.tag,
					host: n.host,
					port: n.port,
					status: n.status,
					expire: n.expire
				})
			})

			const idx = nodes.value.findIndex(n => n.status && !isExpired(n))
			selectedIndex.value = idx !== -1 ? idx : (nodes.value.length ? 0 : null)
			LG('refreshNodes: selectedIndex=', selectedIndex.value)
		} catch (e) {
			LGE('refreshNodes: 请求异常 =>', e)
			uni.showToast({
				title: '获取节点失败',
				icon: 'none'
			})
		} finally {
			isLoading.value = false
			uni.hideLoading()
		}
	}

	function isExpired(n) {
		if (!n?.expire) return false
		return new Date(n.expire).getTime() <= Date.now()
	}

	function formatExpire(exp) {
		if (!exp) return '无过期'
		const d = new Date(exp)
		const y = d.getFullYear()
		const m = (d.getMonth() + 1).toString().padStart(2, '0')
		const day = d.getDate().toString().padStart(2, '0')
		const delta = d.getTime() - Date.now()
		if (delta > 0) {
			const days = Math.ceil(delta / 86400000)
			if (days <= 30) return `${days}天后过期`
		}
		return `${y}-${m}-${day}`
	}

	function selectNode(i) {
		const n = nodes.value[i]
		if (!n) return
		if (!n.status || isExpired(n)) {
			uni.showToast({
				title: '该节点不可用',
				icon: 'none'
			})
			LG('selectNode: 节点不可用 =>', {
				i,
				tag: n.tag,
				status: n.status,
				expire: n.expire
			})
			return
		}
		selectedIndex.value = i
		LG('selectNode: 选择成功 =>', {
			i,
			tag: n.tag
		})
		if (isConnected.value) connectionInfo.value = `${n.tag} · ${n.host}:${n.port}`
	}

	async function handleAuth() {
		if (isLoggedIn.value) {
			uni.showModal({
				title: '确认退出',
				content: '确定要退出登录吗？',
				success: async ({
					confirm
				}) => {
					if (!confirm) return
					LG('handleAuth: 退出登录 -> 强制断开');
					await androidVpn.forceDisconnect(true)

					uni.removeStorageSync('token')
					uni.removeStorageSync('username')
					isLoggedIn.value = false
					token.value = ''
					username.value = ''
					nodes.value = []
					selectedIndex.value = null

					isConnected.value = false
					isConnecting.value = false
					statusText.value = '未连接'
					connectButtonText.value = '连接VPN'
					connectionInfo.value = '--'
					connectionTime.value = '--'

					uni.showToast({
						title: '已退出登录',
						icon: 'success'
					})
				}
			})
		} else {
			LG('handleAuth: 跳转登录页');
			uni.navigateTo({
				url: '/pages/login/login'
			})
		}
	}

	async function toggleVPN() {
		if (isConnecting.value) {
			LG('toggleVPN: 正在连接中，忽略');
			return
		}
		if (!isLoggedIn.value) {
			uni.showToast({
				title: '请先登录',
				icon: 'none'
			});
			LG('toggleVPN: 未登录');
			return
		}
		if (selectedIndex.value === null) {
			uni.showToast({
				title: '请选择节点',
				icon: 'none'
			});
			LG('toggleVPN: 未选择节点');
			return
		}

		LG('toggleVPN: 前置 syncStatus');
		const real = await androidVpn.syncStatus()
		LG('toggleVPN: 原生状态 =>', real)
		if (real.connected) {
			LG('toggleVPN: 真实已连接 => 执行断开');
			await disconnectVPN()
			return
		}

		if (isConnected.value) {
			LG('toggleVPN: JS 标志已连接 => 执行断开');
			await disconnectVPN()
		} else {
			LG('toggleVPN: 执行连接');
			await connectVPN()
		}
	}

	async function connectVPN() {
		const node = nodes.value[selectedIndex.value]
		if (!node) {
			LGE('connectVPN: 未取到节点');
			return
		}
		if (!node.status || isExpired(node)) {
			uni.showToast({
				title: '该节点不可用',
				icon: 'none'
			})
			LGE('connectVPN: 节点不可用 =>', {
				tag: node.tag,
				status: node.status,
				expire: node.expire
			})
			return
		}

		isConnecting.value = true
		statusText.value = '连接中...'
		connectButtonText.value = '连接中...'
		LG('connectVPN: 调用 androidVpn.connect', {
			tag: node.tag,
			host: node.host,
			port: node.port
		})

		try {
			const ret = await androidVpn.connect(node)
			LG('connectVPN: connect 返回 =>', ret)
			// 成功/失败 UI 最终由 handleVpnStatus 统一兜底
		} catch (e) {
			LGE('connectVPN: 异常 =>', e)
			isConnecting.value = false
			isConnected.value = false
			statusText.value = '连接失败'
			connectButtonText.value = '连接VPN'
			uni.showToast({
				title: e.message || '连接失败',
				icon: 'none'
			})
		}
	}

	async function disconnectVPN() {
		LG('disconnectVPN: 调用 androidVpn.disconnect')
		try {
			const ret = await androidVpn.disconnect()
			LG('disconnectVPN: 返回 =>', ret)
		} catch (e) {
			LGE('disconnectVPN: 异常 =>', e)
			uni.showToast({
				title: e.message || '断开失败',
				icon: 'none'
			})
		}
	}

	function handleVpnStatus(s) {
		LG('handleVpnStatus: 收到 =>', s)
		const connected = !!(s && (s.connected || s.isConnected))
		isConnected.value = connected
		isConnecting.value = false
		statusText.value = (s && s.message) ? s.message : (connected ? '已连接' : '未连接')
		connectButtonText.value = connected ? '断开连接' : '连接VPN'

		if (connected && selectedIndex.value !== null) {
			const n = nodes.value[selectedIndex.value]
			connectionInfo.value = `${n.tag} · ${n.host}:${n.port}`
			if (timer) {
				clearInterval(timer);
				timer = null
			}
			let sec = 0
			connectionTime.value = '连接时间: 00:00'
			timer = setInterval(() => {
				sec++
				const mm = String(Math.floor(sec / 60)).padStart(2, '0')
				const ss = String(sec % 60).padStart(2, '0')
				connectionTime.value = `连接时间: ${mm}:${ss}`
			}, 1000)
		} else {
			if (timer) {
				clearInterval(timer);
				timer = null
			}
			connectionInfo.value = '--'
			connectionTime.value = '--'
		}

		if (s && s.status === 'error' && s.message) {
			uni.showToast({
				title: s.message,
				icon: 'none'
			})
		}
	}
</script>





<style lang="scss" scoped>
	.container {
		padding: 20rpx;
		background: linear-gradient(135deg, #1a2a6c, #b21f1f, #fdbb2d);
		min-height: 100vh;
	}

	.header {
		padding: 30rpx;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 16rpx;
		margin-bottom: 30rpx;
		backdrop-filter: blur(10px);
		display: flex;
		flex-direction: column;

		.user-info {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 20rpx;
			width: 100%;

			.welcome-text {
				color: white;
				font-size: 32rpx;
				flex: 1;
				margin-right: 20rpx;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}

			.btn-auth {
				background: rgba(255, 255, 255, 0.2);
				color: white;
				border: none;
				border-radius: 50rpx;
				padding: 10rpx 20rpx;
				font-size: 24rpx;
				flex-shrink: 0;
			}
		}
	}

	.vpn-status-card {
		background: white;
		border-radius: 20rpx;
		padding: 40rpx;
		margin-bottom: 30rpx;
		box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.1);

		.status-header {
			display: flex;
			align-items: center;
			margin-bottom: 20rpx;

			.status-indicator {
				width: 20rpx;
				height: 20rpx;
				border-radius: 50%;
				margin-right: 15rpx;

				&.connected {
					background: #4ade80;
				}

				&.connecting {
					background: #fbbf24;
				}

				&.disconnected {
					background: #f87171;
				}
			}

			.status-text {
				font-size: 32rpx;
				font-weight: bold;
			}
		}

		.connection-info {
			font-size: 28rpx;
			color: #666;
			margin-bottom: 10rpx;
		}

		.connection-time {
			font-size: 24rpx;
			color: #999;
			margin-bottom: 30rpx;
		}

		.btn-connect {
			background: linear-gradient(to right, #4361ee, #3a0ca3);
			color: white;
			border: none;
			border-radius: 50rpx;
			padding: 20rpx 40rpx;
			font-size: 32rpx;

			&:disabled {
				background: #ccc;
			}

			&.connecting {
				background: #fbbf24;
			}
		}
	}

	.section {
		background: white;
		border-radius: 20rpx;
		padding: 30rpx;
		margin-bottom: 30rpx;
		box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.1);

		.section-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 20rpx;

			.section-title {
				font-size: 32rpx;
				font-weight: bold;
				color: #3a0ca3;
			}

			.section-action {
				display: flex;
				align-items: center;

				.refresh-text {
					font-size: 24rpx;
					color: #4361ee;
					margin-right: 10rpx;
				}
			}
		}
	}

	/* 节点统计信息 */
	.nodes-stats {
		margin-bottom: 20rpx;
		padding: 0 10rpx;
	}

	.stats-text {
		font-size: 24rpx;
		color: #666;
	}

	.node-list {
		max-height: 400rpx;

		.node-item {
			display: flex;
			justify-content: space-between;
			align-items: center;
			padding: 20rpx;
			border-bottom: 1rpx solid #f0f0f0;

			&:last-child {
				border-bottom: none;
			}

			&.selected {
				background: #f0f5ff;
				border-radius: 12rpx;
			}

			&.offline {
				opacity: 0.6;
			}

			&.no-auth {
				border-left: 8rpx solid #fbbf24;
			}

			.node-info {
				display: flex;
				align-items: center;
				flex: 1;

				.node-flag {
					font-size: 40rpx;
					margin-right: 20rpx;
				}

				.node-details {
					display: flex;
					flex-direction: column;
					flex: 1;

					.node-name {
						font-size: 28rpx;
						font-weight: bold;
						margin-bottom: 5rpx;
					}

					.node-meta {
						display: flex;
						flex-direction: column;
						gap: 3rpx;
					}

					.node-location {
						font-size: 24rpx;
						color: #999;
					}

					.node-expire {
						font-size: 22rpx;
						color: #f59e0b;
					}
				}
			}

			.node-status {
				display: flex;
				align-items: center;

				.status-indicators {
					display: flex;
					flex-direction: column;
					align-items: flex-end;
					gap: 5rpx;

					.status-online {
						color: #4ade80;
						font-weight: 600;
					}

					.status-offline {
						color: #9ca3af;
					}

					.status-noauth {
						font-size: 20rpx;
						color: #f87171;
						background: #fef2f2;
						padding: 4rpx 8rpx;
						border-radius: 8rpx;
					}
				}

				.selected-indicator {
					margin-left: 10rpx;
				}
			}
		}

		.empty-state {
			text-align: center;
			padding: 40rpx;
			color: #999;
		}
	}

	.app-list {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 20rpx;

		.app-item {
			display: flex;
			flex-direction: column;
			align-items: center;
			padding: 20rpx;
			border-radius: 16rpx;
			background: #f9f9f9;
			transition: all 0.3s;

			&.selected {
				background: #f0f5ff;
				box-shadow: 0 0 0 2rpx #4361ee;
			}

			.app-icon {
				width: 80rpx;
				height: 80rpx;
				border-radius: 20rpx;
				background: #e6eeff;
				display: flex;
				justify-content: center;
				align-items: center;
				margin-bottom: 15rpx;
			}

			.app-label {
				font-size: 24rpx;
				text-align: center;
			}
		}
	}

	/* 使用提示 */
	.tips-section {
		background: #f0f5ff;
	}

	.tips-content {
		padding: 0 10rpx;
	}

	.tip-item {
		display: block;
		font-size: 24rpx;
		color: #666;
		margin-bottom: 10rpx;
		line-height: 1.5;
	}
</style>
<template>
	<view class="container">
		<!-- 头部 -->
		<view class="header">
			<view class="user-info">
				<text class="welcome-text" v-if="isLoggedIn">欢迎, {{username}}</text>
				<text class="welcome-text" v-else>请先登录</text>
				<button class="btn-auth" @click="handleAuth">
					{{isLoggedIn ? '退出登录' : '登录'}}
				</button>
			</view>
		</view>

		<!-- VPN连接状态 -->
		<view class="vpn-status-card">
			<view class="status-header">
				<view class="status-indicator" :class="statusClass"></view>
				<text class="status-text">{{statusText}}</text>
			</view>
			<view class="connection-info">{{connectionInfo}}</view>
			<view class="connection-time">{{connectionTime}}</view>
			<button class="btn-connect" :class="{'connecting': isConnecting}" @click="toggleVPN"
				:disabled="!isLoggedIn || availableNodes.length === 0 || selectedNode === null">
				{{connectButtonText}}
			</button>
		</view>

		<!-- 节点列表 -->
		<view class="section">
			<view class="section-header">
				<text class="section-title">节点列表</text>
				<view class="section-action" @click="fetchNodes">
					<text class="refresh-text">刷新</text>
					<uni-icons type="refresh" size="16" color="#4361ee"></uni-icons>
				</view>
			</view>

			<view class="nodes-stats">
				<text class="stats-text">可用节点: {{availableNodes.length}}/{{nodes.length}}</text>
			</view>

			<scroll-view class="node-list" scroll-y>
				<view v-for="(node, index) in nodes" :key="node._id" class="node-item" :class="{
                'selected': selectedNode === index,
                'offline': !node.isAvailable,
                'no-auth': !node.hasAuth
              }" @click="selectNode(index)">
					<view class="node-info">
						<view class="node-flag">{{getCountryFlag(node.tag)}}</view>
						<view class="node-details">
							<text class="node-name">{{node.tag}}</text>
							<view class="node-meta">
								<text class="node-location">{{node.host}}:{{node.port}}</text>
								<text class="node-expire">{{node.expireText}}</text>
							</view>
						</view>
					</view>
					<view class="node-status">
						<view class="status-indicators">
							<text :class="node.status ? 'status-online' : 'status-offline'">
								{{node.status ? '在线' : '离线'}}
							</text>
							<text v-if="!node.hasAuth" class="status-noauth">无认证</text>
						</view>
						<view v-if="selectedNode === index" class="selected-indicator">
							<uni-icons type="checkmark" size="16" color="#4361ee"></uni-icons>
						</view>
					</view>
				</view>
				<view v-if="nodes.length === 0" class="empty-state">
					<text>暂无节点数据，请先登录或刷新</text>
				</view>
			</scroll-view>
		</view>

		<!-- 应用选择 -->
		<view class="section">
			<view class="section-header">
				<text class="section-title">选择应用</text>
			</view>
			<view class="app-list">
				<view v-for="(app, index) in apps" :key="index" class="app-item"
					:class="{'selected': selectedApps.includes(index)}" @click="toggleAppSelection(index)">
					<view class="app-icon">
						<uni-icons :type="app.icon" size="24" color="#4361ee"></uni-icons>
					</view>
					<text class="app-label">{{app.name}}</text>
				</view>
			</view>
		</view>

		<!-- 使用提示 -->
		<view class="section tips-section">
			<view class="section-header">
				<text class="section-title">使用提示</text>
			</view>
			<view class="tips-content">
				<text class="tip-item">• 请选择状态为"在线"且有认证信息的节点</text>
				<text class="tip-item">• 连接成功后，所有应用流量将通过VPN</text>
				<text class="tip-item">• 首次连接需要授予VPN权限</text>
			</view>
		</view>
	</view>
</template>

<script setup>
	import {
		ref,
		computed,
		onMounted,
		onUnmounted,
	} from 'vue'
	import {
		onShow,
		onReachBottom,
		onPullDownRefresh
	} from '@dcloudio/uni-app'
	import UniIcons from '@/components/uni-icons/uni-icons.vue'
	import androidVpnManager from '@/utils/android-vpn.js'

	// 响应式数据
	const isLoggedIn = ref(false)
	const username = ref('')
	const token = ref('')
	const isConnected = ref(false)
	const isConnecting = ref(false)
	const statusText = ref('未连接')
	const connectionInfo = ref('--')
	const connectionTime = ref('--')
	const connectButtonText = ref('连接VPN')
	const selectedNode = ref(null)
	const selectedApps = ref([0])
	const nodes = ref([])
	const connectionSeconds = ref(0)
	const connectingInterval = ref(null)

	// 分页相关状态
	const page = ref(1)
	const pageSize = ref(20)
	const isBottom = ref(false)
	const isLoading = ref(false)

	// 应用列表
	const apps = ref([{
			name: '浏览器',
			icon: 'compass'
		},
		{
			name: 'WhatsApp',
			icon: 'chat'
		},
		{
			name: 'Telegram',
			icon: 'chatboxes'
		},
		{
			name: 'Twitter',
			icon: 'personadd'
		},
		{
			name: 'Instagram',
			icon: 'camera'
		},
		{
			name: 'Facebook',
			icon: 'person'
		},
		{
			name: '游戏',
			icon: 'game'
		},
		{
			name: '全部应用',
			icon: 'more'
		}
	])

	// 简化的日志记录
	const log = (message, data = null) => {
		if (process.env.NODE_ENV === 'development') {
			console.log(`[VPN] ${message}`, data || '');
		}
	}

	// 计算属性
	const statusClass = computed(() => {
		if (isConnected.value) return 'connected'
		if (isConnecting.value) return 'connecting'
		return 'disconnected'
	})

	// 过滤可用的节点（在线且未过期）
	const availableNodes = computed(() => {
		return nodes.value.filter(node => {
			const isOnline = node.status === true;
			const isNotExpired = new Date(node.expire) > new Date();
			return isOnline && isNotExpired;
		});
	});

	// 生命周期
	onMounted(() => {
		checkLoginStatus();
		setupVpn();
	})

	onShow(() => {
		if (isLoggedIn.value) {
			page.value = 1;
			isBottom.value = false;
			fetchNodes(false);
		}
	})

	// 组件卸载时清理定时器
	onUnmounted(() => {
		if (connectingInterval.value) {
			clearInterval(connectingInterval.value);
			connectingInterval.value = null;
		}
		// 移除VPN状态监听
		androidVpnManager.offStatusUpdate();
	})

	// VPN功能初始化
	const setupVpn = async () => {
		const isAndroid = uni.getSystemInfoSync().platform === 'android';
		log('初始化VPN功能');

		if (isAndroid) {
			try {
				await androidVpnManager.initialize();

				// 注册状态更新回调
				androidVpnManager.onStatusUpdate((status) => {
					handleVpnStatusChange(status);
				});

				// 获取当前状态
				const currentStatus = await androidVpnManager.getStatus();
				handleVpnStatusChange(currentStatus);

			} catch (error) {
				log('VPN初始化失败', error);
				handleVpnStatusChange({
					connected: false,
					isConnected: false,
					status: 'disconnected',
					message: '初始化失败'
				});
			}
		} else {
			log('非Android平台，不支持VPN');
			handleVpnStatusChange({
				connected: false,
				isConnected: false,
				status: 'unsupported',
				message: '当前平台不支持VPN'
			});
		}
	}

	// 上拉加载更多
	onReachBottom(() => {
		if (!isBottom.value && !isLoading.value) {
			page.value++;
			fetchNodes(true);
		}
	})

	// 下拉刷新
	onPullDownRefresh(async () => {
		page.value = 1;
		isBottom.value = false;
		isLoading.value = false;
		await fetchNodes(false);
		uni.stopPullDownRefresh();
	})

	// 方法
	const checkLoginStatus = () => {
		const storedToken = uni.getStorageSync('token');
		const storedUsername = uni.getStorageSync('username');
		if (storedToken && storedUsername) {
			isLoggedIn.value = true;
			username.value = storedUsername;
			token.value = storedToken;
		}
	}

	const fetchNodes = async (isLoadMore = false) => {
		if (!isLoggedIn.value) {
			uni.showToast({
				title: '请先登录',
				icon: 'none'
			});
			return;
		}

		if (isLoading.value) return;
		isLoading.value = true;

		if (!isLoadMore) {
			uni.showLoading({
				title: '获取节点中...'
			});
		}

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
			});

			if (res.statusCode === 200 && res.data) {
				let newNodes = [];

				// 适配不同的响应格式
				if (Array.isArray(res.data)) {
					newNodes = res.data;
				} else if (res.data.nodes && Array.isArray(res.data.nodes)) {
					newNodes = res.data.nodes;
				} else if (res.data.data && Array.isArray(res.data.data)) {
					newNodes = res.data.data;
				} else {
					newNodes = [];
				}

				// 处理节点数据，添加格式化信息
				const processedNodes = newNodes.map(node => ({
					...node,
					displayName: node.tag || '未知节点',
					isAvailable: node.status === true && new Date(node.expire) > new Date(),
					expireText: formatDate(node.expire),
					hasAuth: !!(node.account && node.password)
				}));

				if (isLoadMore) {
					nodes.value = [...nodes.value, ...processedNodes];
				} else {
					nodes.value = processedNodes;

					// 自动选择第一个可用节点
					const firstAvailableIndex = processedNodes.findIndex(node => node.isAvailable);
					if (firstAvailableIndex !== -1) {
						selectedNode.value = firstAvailableIndex;
					} else if (processedNodes.length > 0) {
						selectedNode.value = 0;
					}
				}

				const total = res.data.total || newNodes.length;
				if (newNodes.length < pageSize.value || nodes.value.length >= total) {
					isBottom.value = true;
				}

				if (!isLoadMore) {
					uni.hideLoading();
				}
			} else {
				throw new Error(res.data?.message || '获取节点失败');
			}
		} catch (error) {
			if (!isLoadMore) {
				uni.hideLoading();
			}
			uni.showToast({
				title: '获取节点失败',
				icon: 'none'
			});
			log('获取节点失败:', error);
		} finally {
			isLoading.value = false;
		}
	}

	const handleAuth = () => {
		if (isLoggedIn.value) {
			// 退出登录
			uni.showModal({
				title: '确认退出',
				content: '确定要退出登录吗？',
				success: (res) => {
					if (res.confirm) {
						uni.removeStorageSync('token');
						uni.removeStorageSync('username');
						isLoggedIn.value = false;
						token.value = '';
						nodes.value = [];
						selectedNode.value = null;

						// 如果已连接VPN，先断开
						if (isConnected.value) {
							disconnectVPN();
						}

						uni.showToast({
							title: '已退出登录',
							icon: 'success'
						});
					}
				}
			});
		} else {
			// 跳转到登录页面
			uni.navigateTo({
				url: '/pages/login/login'
			});
		}
	}

	const connectVPN = async () => {
		// 1. 检查是否正在连接中
		if (isConnecting.value) {
			uni.showToast({
				title: '连接正在进行中，请稍候',
				icon: 'none',
				duration: 1000
			});
			return;
		}

		// 2. 前置检查
		if (!isLoggedIn.value) {
			uni.showToast({
				title: '请先登录',
				icon: 'none'
			});
			return;
		}

		if (selectedNode.value === null) {
			uni.showToast({
				title: '请先选择节点',
				icon: 'none'
			});
			return;
		}

		const selectedNodeData = nodes.value[selectedNode.value];

		if (!selectedNodeData.isAvailable) {
			uni.showToast({
				title: '当前节点不可用',
				icon: 'none'
			});
			return;
		}

		if (!selectedNodeData.hasAuth) {
			uni.showToast({
				title: '当前节点缺少认证信息',
				icon: 'none'
			});
			return;
		}

		log('开始VPN连接流程', {
			node: selectedNodeData.tag
		});

		// 3. 更新为连接中状态
		isConnecting.value = true;
		statusText.value = '连接中...';
		connectButtonText.value = '连接中';

		try {
			await androidVpnManager.connect(selectedNodeData);
			log('VPN连接指令完成');

		} catch (error) {
			log('VPN连接错误', error);
			(error);
		}
	}

	const disconnectVPN = async () => {
		try {
			log('开始断开VPN连接');
			await androidVpnManager.disconnect();
			log('VPN断开指令完成');

		} catch (error) {
			log('断开VPN失败', error);
			uni.showToast({
				title: error.message || '断开VPN失败',
				icon: 'none'
			});
		}
	}

	const toggleVPN = async () => {
		if (isConnecting.value) {
			return;
		}

		if (!isLoggedIn.value) {
			uni.showToast({
				title: '请先登录',
				icon: 'none'
			});
			return;
		}

		if (nodes.value.length === 0) {
			uni.showToast({
				title: '暂无可用节点',
				icon: 'none'
			});
			return;
		}

		if (selectedNode.value === null) {
			uni.showToast({
				title: '请先选择节点',
				icon: 'none'
			});
			return;
		}

		const selectedNodeData = nodes.value[selectedNode.value];

		// 检查节点是否可用
		if (!selectedNodeData.isAvailable) {
			uni.showToast({
				title: '当前节点不可用',
				icon: 'none'
			});
			return;
		}

		// 检查节点是否有认证信息
		if (!selectedNodeData.hasAuth) {
			uni.showToast({
				title: '当前节点缺少认证信息',
				icon: 'none'
			});
			return;
		}

		log('切换VPN状态', {
			isConnected: isConnected.value,
			isConnecting: isConnecting.value,
			node: selectedNodeData.tag
		});

		if (isConnected.value) {
			await disconnectVPN();
		} else {
			await connectVPN();
		}
	}

	// 状态处理函数
	const handleVpnStatusChange = (status) => {
		const connected = status.connected !== undefined ? status.connected :
			(status.isConnected !== undefined ? status.isConnected : false);

		isConnected.value = connected;
		isConnecting.value = false;

		if (connected) {
			// 已连接状态
			statusText.value = '已连接';
			connectButtonText.value = '断开连接';

			if (selectedNode.value !== null) {
				const selectedNodeData = nodes.value[selectedNode.value];
				connectionInfo.value = `${selectedNodeData.tag} · ${selectedNodeData.host}:${selectedNodeData.port}`;
			}

			// 开始计时
			connectionSeconds.value = 0;
			updateConnectionTime();
			if (connectingInterval.value) {
				clearInterval(connectingInterval.value);
			}
			connectingInterval.value = setInterval(updateConnectionTime, 1000);

			uni.showToast({
				title: status.message || 'VPN连接成功',
				icon: 'success',
				duration: 2000
			});
		} else {
			// 未连接状态
			statusText.value = status.message || '未连接';
			connectButtonText.value = '连接VPN';
			connectionInfo.value = '--';
			connectionTime.value = '--';

			if (connectingInterval.value) {
				clearInterval(connectingInterval.value);
				connectingInterval.value = null;
			}

			// 只有明确错误信息时才显示提示
			if (status.message && status.message !== '未连接' && !status.message.includes('初始化')) {
				uni.showToast({
					title: status.message,
					icon: 'none',
					duration: 2000
				});
			}
		}
	}

	// 错误处理函数
	const handleVpnError = (error) => {
		let errorMessage = 'VPN连接失败';

		if (error && typeof error === 'object') {
			errorMessage = error.message || 'VPN连接失败';
		}

		console.error('处理VPN错误:', errorMessage);

		isConnecting.value = false;
		isConnected.value = false;

		// 特殊处理插件初始化错误
		if (errorMessage.includes('插件未初始化') || errorMessage.includes('插件不可用')) {
			errorMessage = 'VPN功能暂不可用，正在使用模拟模式';

			// 尝试使用模拟模式连接
			setTimeout(async () => {
				console.log('尝试使用模拟模式连接');
				try {
					const selectedNodeData = nodes.value[selectedNode.value];
					await androidVpnManager.mockConnect(selectedNodeData);
				} catch (mockError) {
					console.error('模拟模式连接也失败:', mockError);
				}
			}, 1000);
		}

		statusText.value = '连接失败';
		connectButtonText.value = '连接VPN';

		uni.showToast({
			title: errorMessage,
			icon: 'none',
			duration: 3000
		});

		handleVpnStatusChange({
			connected: false,
			isConnected: false,
			status: 'error',
			message: errorMessage
		});
	}
	const updateConnectionTime = () => {
		connectionSeconds.value++;
		const hours = Math.floor(connectionSeconds.value / 3600);
		const minutes = Math.floor((connectionSeconds.value % 3600) / 60);
		const seconds = connectionSeconds.value % 60;

		if (hours > 0) {
			connectionTime.value =
				`连接时间: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
		} else {
			connectionTime.value =
				`连接时间: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
		}
	}

	const selectNode = (index) => {
		const node = nodes.value[index];

		if (!node.isAvailable) {
			uni.showToast({
				title: '该节点不可用',
				icon: 'none'
			});
			return;
		}

		if (!node.hasAuth) {
			uni.showToast({
				title: '该节点缺少认证信息',
				icon: 'none'
			});
			return;
		}

		selectedNode.value = index;

		// 如果已连接，更新连接信息
		if (isConnected.value) {
			connectionInfo.value = `${node.tag} · ${node.host}:${node.port}`;
		}

		uni.showToast({
			title: `已选择: ${node.tag}`,
			icon: 'success'
		});
	}

	const toggleAppSelection = (index) => {
		if (index === 7) {
			// 选择全部应用
			selectedApps.value = [7];
		} else {
			if (selectedApps.value.includes(index)) {
				// 取消选择
				selectedApps.value = selectedApps.value.filter(i => i !== index);
				// 如果取消了全部选择，且没有其他选择，则选择全部应用
				if (selectedApps.value.length === 0) {
					selectedApps.value = [7];
				}
			} else {
				// 选择应用，移除"全部应用"选项如果存在
				selectedApps.value = selectedApps.value.filter(i => i !== 7);
				selectedApps.value.push(index);
			}
		}
	}

	const getCountryFlag = (tag) => {
		const flagMap = {
			'广东': '🇨🇳',
			'河间': '🇨🇳',
			'天津': '🇨🇳',
			'宁波': '🇨🇳',
			'蠡县': '🇨🇳',
			'澄海': '🇨🇳',
			'凤翔': '🇨🇳'
		};

		for (const [key, flag] of Object.entries(flagMap)) {
			if (tag.includes(key)) {
				return flag;
			}
		}

		return '🌐';
	}

	const formatDate = (dateString) => {
		if (!dateString) return '未知';

		const date = new Date(dateString);
		const now = new Date();
		const diffTime = Math.abs(now - date);
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		if (diffDays <= 30) {
			return `${diffDays}天后过期`;
		} else {
			return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
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
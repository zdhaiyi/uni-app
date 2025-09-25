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
              }" @click="selectNode(index)" @longpress="showNodeDetails(index)">
					<view class="node-info">
						<view class="node-flag">{{getCountryFlag(node.tag)}}</view>
						<view class="node-details">
							<text class="node-name">{{node.tag}}</text>
							<text class="node-location">{{node.host}}:{{node.port}}</text>
							<text class="node-expire">{{node.expireText}}</text>
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
				<text class="tip-item">• 长按节点可查看详细信息</text>
				<text class="tip-item">• 连接成功后，所有应用流量将通过VPN</text>
			</view>
		</view>
	</view>
</template>

<script>
import androidVpnManager from '@/utils/android-vpn.js'

export default {
    data() {
        return {
            isLoggedIn: false,
            username: '',
            token: '',
            isConnected: false,
            isConnecting: false,
            statusText: '未连接',
            connectionInfo: '--',
            connectionTime: '--',
            connectButtonText: '连接VPN',
            selectedNode: null,
            selectedApps: [0],
            nodes: [],
            connectionSeconds: 0,
            connectingInterval: null,
            
            // 分页相关状态
            page: 1,
            pageSize: 20,
            isBottom: false,
            isLoading: false,
            
            // 应用列表
            apps: [
                { name: '浏览器', icon: 'compass' },
                { name: 'WhatsApp', icon: 'chat' },
                { name: 'Telegram', icon: 'chatboxes' },
                { name: 'Twitter', icon: 'personadd' },
                { name: 'Instagram', icon: 'camera' },
                { name: 'Facebook', icon: 'person' },
                { name: '游戏', icon: 'game' },
                { name: '全部应用', icon: 'more' }
            ]
        }
    },
    
    computed: {
        statusClass() {
            if (this.isConnected) return 'connected'
            if (this.isConnecting) return 'connecting'
            return 'disconnected'
        },
        
        availableNodes() {
            return this.nodes.filter(node => {
                const isOnline = node.status === true
                const isNotExpired = new Date(node.expire) > new Date()
                return isOnline && isNotExpired
            })
        }
    },
    
    onLoad() {
        this.checkLoginStatus()
        this.setupVpn()
    },
    
    onShow() {
        if (this.isLoggedIn) {
            this.page = 1
            this.isBottom = false
            this.fetchNodes(false)
        }
    },
    
    onUnload() {
        if (this.connectingInterval) {
            clearInterval(this.connectingInterval)
            this.connectingInterval = null
        }
    },
    
    onReachBottom() {
        if (!this.isBottom && !this.isLoading) {
            this.page++
            this.fetchNodes(true)
        }
    },
    
    onPullDownRefresh() {
        this.page = 1
        this.isBottom = false
        this.isLoading = false
        this.fetchNodes(false).then(() => {
            uni.stopPullDownRefresh()
        })
    },
    
    methods: {
        checkLoginStatus() {
            const storedToken = uni.getStorageSync('token')
            const storedUsername = uni.getStorageSync('username')
            if (storedToken && storedUsername) {
                this.isLoggedIn = true
                this.username = storedUsername
                this.token = storedToken
            }
        },
        
        async setupVpn() {
            const isAndroid = uni.getSystemInfoSync().platform === 'android'
            
            if (isAndroid) {
                try {
                    await androidVpnManager.initialize()
                    
                    // 监听VPN状态变化
                    androidVpnManager.onStatusUpdate((status) => {
                        console.log('VPN状态更新:', status)
                        
                        if (status.connected) {
                            this.isConnected = true
                            this.statusText = '已连接'
                            this.connectButtonText = '断开连接'
                            
                            if (this.selectedNode !== null) {
                                const selectedNodeData = this.nodes[this.selectedNode]
                                this.connectionInfo = `${selectedNodeData.tag} · ${selectedNodeData.host}:${selectedNodeData.port}`
                            }
                            
                            // 开始计时
                            this.connectionSeconds = 0
                            this.updateConnectionTime()
                            this.connectingInterval = setInterval(this.updateConnectionTime, 1000)
                        } else {
                            this.isConnected = false
                            this.statusText = '未连接'
                            this.connectButtonText = '连接VPN'
                            this.connectionInfo = '--'
                            this.connectionTime = '--'
                            
                            if (this.connectingInterval) {
                                clearInterval(this.connectingInterval)
                                this.connectingInterval = null
                            }
                        }
                    })
                } catch (error) {
                    console.error('VPN初始化失败:', error)
                }
            }
        },
        
        fetchNodes(isLoadMore = false) {
            if (!this.isLoggedIn) {
                uni.showToast({
                    title: '请先登录',
                    icon: 'none'
                })
                return Promise.resolve()
            }
            
            if (this.isLoading) return Promise.resolve()
            this.isLoading = true
            
            if (!isLoadMore) {
                uni.showLoading({
                    title: '获取节点中...'
                })
            }
            
            return new Promise((resolve) => {
                uni.request({
                    url: 'http://124.223.21.69/api/nodes',
                    method: 'GET',
                    data: {
                        page: this.page,
                        pageSize: this.pageSize
                    },
                    header: {
                        'Authorization': 'Bearer ' + this.token
                    },
                    success: (res) => {
                        if (res.statusCode === 200 && res.data) {
                            let newNodes = []
                            
                            if (Array.isArray(res.data)) {
                                newNodes = res.data
                            } else if (res.data.nodes && Array.isArray(res.data.nodes)) {
                                newNodes = res.data.nodes
                            } else if (res.data.data && Array.isArray(res.data.data)) {
                                newNodes = res.data.data
                            } else {
                                newNodes = []
                            }
                            
                            const processedNodes = newNodes.map(node => ({
                                ...node,
                                displayName: node.tag || '未知节点',
                                isAvailable: node.status === true && new Date(node.expire) > new Date(),
                                expireText: this.formatDate(node.expire),
                                hasAuth: !!(node.account && node.password)
                            }))
                            
                            if (isLoadMore) {
                                this.nodes = [...this.nodes, ...processedNodes]
                            } else {
                                this.nodes = processedNodes
                                
                                // 自动选择第一个可用节点
                                const firstAvailableIndex = processedNodes.findIndex(node => node.isAvailable)
                                if (firstAvailableIndex !== -1) {
                                    this.selectedNode = firstAvailableIndex
                                } else if (processedNodes.length > 0) {
                                    this.selectedNode = 0
                                }
                            }
                            
                            const total = res.data.total || newNodes.length
                            if (newNodes.length < this.pageSize || this.nodes.length >= total) {
                                this.isBottom = true
                            }
                            
                            if (!isLoadMore) {
                                uni.hideLoading()
                                if (newNodes.length > 0) {
                                    uni.showToast({
                                        title: `获取${newNodes.length}个节点`,
                                        icon: 'success'
                                    })
                                }
                            }
                            resolve()
                        } else {
                            throw new Error(res.data?.message || '获取节点失败')
                        }
                    },
                    fail: (error) => {
                        if (!isLoadMore) {
                            uni.hideLoading()
                        }
                        uni.showToast({
                            title: '获取节点失败',
                            icon: 'none'
                        })
                        console.error('获取节点失败:', error)
                        resolve()
                    },
                    complete: () => {
                        this.isLoading = false
                    }
                })
            })
        },
        
        handleAuth() {
            if (this.isLoggedIn) {
                uni.showModal({
                    title: '确认退出',
                    content: '确定要退出登录吗？',
                    success: (res) => {
                        if (res.confirm) {
                            uni.removeStorageSync('token')
                            uni.removeStorageSync('username')
                            this.isLoggedIn = false
                            this.token = ''
                            this.nodes = []
                            this.selectedNode = null
                            
                            if (this.isConnected) {
                                this.toggleVPN()
                            }
                            
                            uni.showToast({
                                title: '已退出登录',
                                icon: 'success'
                            })
                        }
                    }
                })
            } else {
                uni.navigateTo({
                    url: '/pages/login/login'
                })
            }
        },
        
        async toggleVPN() {
            if (!this.isLoggedIn) {
                uni.showToast({
                    title: '请先登录',
                    icon: 'none'
                })
                return
            }
            
            if (this.nodes.length === 0) {
                uni.showToast({
                    title: '暂无可用节点',
                    icon: 'none'
                })
                return
            }
            
            if (this.selectedNode === null) {
                uni.showToast({
                    title: '请先选择节点',
                    icon: 'none'
                })
                return
            }
            
            const selectedNodeData = this.nodes[this.selectedNode]
            
            if (!selectedNodeData.isAvailable) {
                uni.showToast({
                    title: '当前节点不可用',
                    icon: 'none'
                })
                return
            }
            
            if (!selectedNodeData.hasAuth) {
                uni.showToast({
                    title: '当前节点缺少认证信息',
                    icon: 'none'
                })
                return
            }
            
            if (this.isConnected) {
                await this.disconnectVPN()
            } else {
                await this.connectVPN()
            }
        },
        
        async connectVPN() {
            this.isConnecting = true
            this.statusText = '连接中...'
            this.connectButtonText = '连接中'
            
            try {
                const selectedNodeData = this.nodes[this.selectedNode]
                
                if (uni.getSystemInfoSync().platform === 'android') {
                    await androidVpnManager.connect(selectedNodeData)
                } else {
                    // 模拟连接过程
                    setTimeout(() => {
                        this.isConnecting = false
                        this.isConnected = true
                        this.statusText = '已连接'
                        this.connectButtonText = '断开连接'
                        
                        this.connectionInfo = `${selectedNodeData.tag} · ${selectedNodeData.host}:${selectedNodeData.port}`
                        
                        this.connectionSeconds = 0
                        this.updateConnectionTime()
                        this.connectingInterval = setInterval(this.updateConnectionTime, 1000)
                        
                        uni.showToast({
                            title: 'VPN连接成功',
                            icon: 'success'
                        })
                    }, 2000)
                }
            } catch (error) {
                console.error('VPN连接失败:', error)
                this.handleVpnError(error)
            }
        },
        
        async disconnectVPN() {
            try {
                if (uni.getSystemInfoSync().platform === 'android') {
                    await androidVpnManager.disconnect()
                } else {
                    this.isConnected = false
                    this.statusText = '未连接'
                    this.connectButtonText = '连接VPN'
                    this.connectionInfo = '--'
                    this.connectionTime = '--'
                    
                    if (this.connectingInterval) {
                        clearInterval(this.connectingInterval)
                        this.connectingInterval = null
                    }
                    
                    uni.showToast({
                        title: 'VPN已断开',
                        icon: 'success'
                    })
                }
            } catch (error) {
                console.error('断开VPN失败:', error)
                uni.showToast({
                    title: error.message || '断开VPN失败',
                    icon: 'none'
                })
            }
        },
        
        handleVpnError(error) {
            this.isConnecting = false
            this.isConnected = false
            this.statusText = '连接失败'
            this.connectButtonText = '连接VPN'
            
            uni.showToast({
                title: error.message || 'VPN连接失败',
                icon: 'none'
            })
        },
        
        updateConnectionTime() {
            this.connectionSeconds++
            const hours = Math.floor(this.connectionSeconds / 3600)
            const minutes = Math.floor((this.connectionSeconds % 3600) / 60)
            const seconds = this.connectionSeconds % 60
            
            if (hours > 0) {
                this.connectionTime = `连接时间: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            } else {
                this.connectionTime = `连接时间: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            }
        },
        
        selectNode(index) {
            const node = this.nodes[index]
            
            if (!node.isAvailable) {
                uni.showToast({
                    title: '该节点不可用',
                    icon: 'none'
                })
                return
            }
            
            if (!node.hasAuth) {
                uni.showToast({
                    title: '该节点缺少认证信息',
                    icon: 'none'
                })
                return
            }
            
            this.selectedNode = index
            
            if (this.isConnected) {
                this.connectionInfo = `${node.tag} · ${node.host}:${node.port}`
            }
            
            uni.showToast({
                title: `已选择: ${node.tag}`,
                icon: 'success'
            })
        },
        
        toggleAppSelection(index) {
            if (index === 7) {
                this.selectedApps = [7]
            } else {
                if (this.selectedApps.includes(index)) {
                    this.selectedApps = this.selectedApps.filter(i => i !== index)
                    if (this.selectedApps.length === 0) {
                        this.selectedApps = [7]
                    }
                } else {
                    this.selectedApps = this.selectedApps.filter(i => i !== 7)
                    this.selectedApps.push(index)
                }
            }
        },
        
        getCountryFlag(tag) {
            const flagMap = {
                '广东': '🇨🇳',
                '河间': '🇨🇳',
                '天津': '🇨🇳',
                '宁波': '🇨🇳',
                '蠡县': '🇨🇳',
                '澄海': '🇨🇳',
                '凤翔': '🇨🇳'
            }
            
            for (const [key, flag] of Object.entries(flagMap)) {
                if (tag.includes(key)) {
                    return flag
                }
            }
            
            return '🌐'
        },
        
        formatDate(dateString) {
            if (!dateString) return '未知'
            
            const date = new Date(dateString)
            const now = new Date()
            const diffTime = Math.abs(now - date)
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            
            if (diffDays <= 30) {
                return `${diffDays}天后过期`
            } else {
                return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
            }
        },
        
        showNodeDetails(index) {
            const node = this.nodes[index]
            let content = `服务器: ${node.host}:${node.port}\n`
            content += `状态: ${node.status ? '在线' : '离线'}\n`
            content += `过期时间: ${this.formatDate(node.expire)}\n`
            
            if (node.account) {
                content += `账号: ${node.account}\n`
            }
            
            if (node.remark) {
                content += `备注: ${node.remark}`
            }
            
            uni.showModal({
                title: node.tag,
                content: content,
                showCancel: false,
                confirmText: '知道了'
            })
        }
    }
}
</script>

<style lang="scss" scoped>
/* 样式保持不变，与Vue3版本完全相同 */
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
                }

                .node-location {
                    font-size: 24rpx;
                    color: #999;
                }

                .node-expire {
                    font-size: 22rpx;
                    color: #f59e0b;
                    margin-top: 5rpx;
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
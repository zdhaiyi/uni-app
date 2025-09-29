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
            <!-- <view class="node-flag">{{getCountryFlag(node.tag)}}</view> -->
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import androidVpnManager from '@/utils/android-vpn.js'

// 基础状态
const isLoggedIn = ref(false)
const username = ref('')
const token = ref('')

// 连接状态
const isConnected = ref(false)
const isConnecting = ref(false)
const statusText = ref('未连接')
const connectionInfo = ref('--')
const connectionTime = ref('--')
const connectButtonText = ref('连接VPN')

// 节点
const nodes = ref([])
const selectedNode = ref(null)

// 辅助
const isLoading = ref(false)
let timer = null
let seconds = 0

// 计算属性
const availableNodes = computed(() =>
  nodes.value.filter(n => n.status === true && new Date(n.expire) > new Date())
)

const statusClass = computed(() => {
  if (isConnected.value) return 'connected'
  if (isConnecting.value) return 'connecting'
  return 'disconnected'
})

// 生命周期
onMounted(async () => {
  checkLoginStatus()
  // 还原上次连接状态
  const st = androidVpnManager.getStatus()
  isConnected.value = !!st.connected
  if (st.connected && st.node) {
    connectionInfo.value = `${st.node.tag || '已连接节点'} · ${st.node.host}:${st.node.port}`
    connectButtonText.value = '断开连接'
    startTimer()
  }
  if (isLoggedIn.value) {
    await fetchNodes()
  }

  // 可选：监听状态
  androidVpnManager.onStatusUpdate((st) => {
    isConnected.value = !!st.connected
    isConnecting.value = false
    if (st.connected) {
      statusText.value = '已连接'
      connectButtonText.value = '断开连接'
      const node = androidVpnManager.getActiveNode()
      if (node) {
        connectionInfo.value = `${node.tag || '已连接节点'} · ${node.host}:${node.port}`
      }
      startTimer()
    } else {
      statusText.value = '未连接'
      connectButtonText.value = '连接VPN'
      connectionInfo.value = '--'
      connectionTime.value = '--'
      stopTimer()
    }
  })
})

onUnmounted(() => {
  androidVpnManager.offStatusUpdate()
  stopTimer()
})

// 登录状态
function checkLoginStatus () {
  const tk = uni.getStorageSync('token')
  const un = uni.getStorageSync('username')
  if (tk && un) {
    isLoggedIn.value = true
    username.value = un
    token.value = tk
  } else {
    isLoggedIn.value = false
  }
}

// 拉取节点（不改你的 UI，只精简逻辑）
async function fetchNodes () {
  if (!isLoggedIn.value) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  if (isLoading.value) return
  isLoading.value = true
  uni.showLoading({ title: '获取节点中...' })
  try {
    const res = await uni.request({
      url: 'http://124.223.21.69/api/nodes',
      method: 'GET',
      header: { 'Authorization': 'Bearer ' + token.value }
    })

    let list = []
    if (Array.isArray(res.data)) {
      list = res.data
    } else if (res.data?.nodes && Array.isArray(res.data.nodes)) {
      list = res.data.nodes
    } else if (res.data?.data && Array.isArray(res.data.data)) {
      list = res.data.data
    }

    nodes.value = list.map(n => ({
      ...n,
      isAvailable: n.status === true && new Date(n.expire) > new Date(),
      hasAuth: !!(n.account && n.password),
      expireText: formatDate(n.expire)
    }))

    // 自动选择第一个可用 + 有认证的节点；否则第一个在线节点；否则第一个
    let idx = nodes.value.findIndex(n => n.isAvailable && n.hasAuth)
    if (idx < 0) idx = nodes.value.findIndex(n => n.isAvailable)
    if (idx < 0 && nodes.value.length > 0) idx = 0
    selectedNode.value = idx >= 0 ? idx : null
  } catch (e) {
    console.error('获取节点失败:', e)
    uni.showToast({ title: '获取节点失败', icon: 'none' })
  } finally {
    isLoading.value = false
    uni.hideLoading()
  }
}

// 点击列表选择节点
function selectNode (index) {
  const n = nodes.value[index]
  if (!n) return
  if (!n.isAvailable) {
    uni.showToast({ title: '该节点不可用', icon: 'none' })
    return
  }
  selectedNode.value = index
  // 已连接时，更新展示信息
  if (isConnected.value) {
    connectionInfo.value = `${n.tag} · ${n.host}:${n.port}`
  }
}

// 登录/退出
function handleAuth () {
  if (isLoggedIn.value) {
    uni.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: async (r) => {
        if (r.confirm) {
          if (isConnected.value) await disconnectVPN()
          uni.removeStorageSync('token')
          uni.removeStorageSync('username')
          isLoggedIn.value = false
          token.value = ''
          nodes.value = []
          selectedNode.value = null
          uni.showToast({ title: '已退出登录', icon: 'success' })
        }
      }
    })
  } else {
    uni.navigateTo({ url: '/pages/login/login' })
  }
}

// 连接/断开切换
async function toggleVPN () {
  if (isConnecting.value) return
  if (!isLoggedIn.value) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  if (selectedNode.value === null) {
    uni.showToast({ title: '请先选择节点', icon: 'none' })
    return
  }

  if (isConnected.value) {
    await disconnectVPN()
  } else {
    await connectVPN()
  }
}

// 连接逻辑（不使用原生插件）
async function connectVPN () {
  const node = nodes.value[selectedNode.value]
  if (!node) {
    uni.showToast({ title: '未找到节点', icon: 'none' })
    return
  }
  if (!node.isAvailable) {
    uni.showToast({ title: '该节点不可用', icon: 'none' })
    return
  }

  isConnecting.value = true
  statusText.value = '连接中...'
  connectButtonText.value = '连接中...'

  try {
    await androidVpnManager.connect(node) // 只做前端标记 + 存储节点
    // 成功
    isConnected.value = true
    statusText.value = '已连接'
    connectButtonText.value = '断开连接'
    connectionInfo.value = `${node.tag} · ${node.host}:${node.port}`
    seconds = 0
    connectionTime.value = '连接时间: 00:00'
    startTimer()
    uni.showToast({ title: '连接成功', icon: 'success' })
  } catch (e) {
    console.error('连接失败', e)
    isConnected.value = false
    statusText.value = '连接失败'
    connectButtonText.value = '连接VPN'
    uni.showToast({ title: e.message || '连接失败', icon: 'none' })
  } finally {
    isConnecting.value = false
  }
}

async function disconnectVPN () {
  try {
    await androidVpnManager.disconnect()
    isConnected.value = false
    statusText.value = '未连接'
    connectButtonText.value = '连接VPN'
    connectionInfo.value = '--'
    connectionTime.value = '--'
    stopTimer()
    uni.showToast({ title: '已断开', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e.message || '断开失败', icon: 'none' })
  }
}

// 计时器
function startTimer () {
  stopTimer()
  timer = setInterval(() => {
    seconds++
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
    const ss = String(seconds % 60).padStart(2, '0')
    connectionTime.value = `连接时间: ${mm}:${ss}`
  }, 1000)
}
function stopTimer () {
  if (timer) clearInterval(timer)
  timer = null
  seconds = 0
}

// 日期格式化
function formatDate (s) {
  if (!s) return '未知'
  const d = new Date(s)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const daysLeft = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24))
  return daysLeft > 0 && daysLeft <= 30 ? `${daysLeft}天后过期` : `${y}-${m}-${day}`
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
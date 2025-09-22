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
      <!-- <text class="app-name">e加速</text> -->
    </view>

    <!-- VPN连接状态 -->
    <view class="vpn-status-card">
      <view class="status-header">
        <view class="status-indicator" :class="statusClass"></view>
        <text class="status-text">{{statusText}}</text>
      </view>
      <view class="connection-info">{{connectionInfo}}</view>
      <view class="connection-time">{{connectionTime}}</view>
      <button class="btn-connect" :class="{'connecting': isConnecting}" @click="toggleVPN" :disabled="!isLoggedIn || nodes.length === 0">
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
      <scroll-view class="node-list" scroll-y>
        <view v-for="(node, index) in nodes" :key="index" 
              class="node-item" :class="{'selected': selectedNode === index}"
              @click="selectNode(index)">
          <view class="node-info">
            <view class="node-flag">{{getCountryFlag(node.tag)}}</view>
            <view class="node-details">
              <text class="node-name">{{node.tag}}</text>
              <text class="node-location">{{node.host}}:{{node.port}}</text>
            </view>
          </view>
          <view class="node-ping">
            <text :class="node.status ? 'status-online' : 'status-offline'">
                {{node.status ? '在线' : '离线'}}
              </text>
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
        <view v-for="(app, index) in apps" :key="index" 
             class="app-item" :class="{'selected': selectedApps.includes(index)}"
             @click="toggleAppSelection(index)">
          <view class="app-icon">
            <uni-icons :type="app.icon" size="24" color="#4361ee"></uni-icons>
          </view>
          <text class="app-label">{{app.name}}</text>
        </view>
      </view>
    </view>

    <!-- 连接信息 -->
<!--    <view v-if="selectedNode !== null && nodes[selectedNode]" class="section connection-details">
      <view class="section-header">
        <text class="section-title">连接信息</text>
      </view>
      <view class="info-item">
        <text class="info-label">服务器:</text>
        <text class="info-value">{{nodes[selectedNode].host}}:{{nodes[selectedNode].port}}</text>
      </view>
      <view class="info-item">
        <text class="info-label">账号:</text>
        <text class="info-value">{{nodes[selectedNode].account}}</text>
      </view>
      <view class="info-item">
        <text class="info-label">密码:</text>
        <text class="info-value">{{nodes[selectedNode].password}}</text>
      </view>
      <view class="info-item">
        <text class="info-label">协议:</text>
        <text class="info-value">SOCKS5</text>
      </view>
      <view class="info-item">
        <text class="info-label">到期时间:</text>
        <text class="info-value">{{formatDate(nodes[selectedNode].expire)}}</text>
      </view>
    </view> -->

    <!-- 底部信息 -->
    <!-- <view class="footer"> -->
      <!-- <text class="footer-text">© 2025 VPN助手 | 安全稳定的网络加速服务</text> -->
    <!-- </view> -->
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onShow, onReachBottom, onPullDownRefresh } from '@dcloudio/uni-app'
import UniIcons from '@/components/uni-icons/uni-icons.vue'

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
const selectedNode = ref(0)
const selectedApps = ref([0])
const nodes = ref([])
const connectionSeconds = ref(0)
const connectingInterval = ref(null)

// 分页相关状态
const page = ref(1)
const pageSize = ref(10)
const isBottom = ref(false)
const isLoading = ref(false)

// 应用列表
const apps = ref([
  { name: '浏览器', icon: 'compass' },
  { name: 'WhatsApp', icon: 'chat' },
  { name: 'Telegram', icon: 'chatboxes' },
  { name: 'Twitter', icon: 'personadd' },
  { name: 'Instagram', icon: 'camera' },
  { name: 'Facebook', icon: 'person' },
  { name: '游戏', icon: 'game' },
  { name: '全部应用', icon: 'more' }
])

// 计算属性
const statusClass = computed(() => {
  if (isConnected.value) return 'connected'
  if (isConnecting.value) return 'connecting'
  return 'disconnected'
})

// 生命周期
onMounted(() => {
  checkLoginStatus()
})

onShow(() => {
  if (isLoggedIn.value) {
    page.value = 1
    isBottom.value = false
    fetchNodes(false)
  }
})

// 组件卸载时清理定时器
onUnmounted(() => {
  if (connectingInterval.value) {
    clearInterval(connectingInterval.value)
    connectingInterval.value = null
  }
})

// 上拉加载更多
onReachBottom(() => {
  if (!isBottom.value && !isLoading.value) {
    page.value++
    fetchNodes(true)
  }
})

// 下拉刷新
onPullDownRefresh(async () => {
  page.value = 1
  isBottom.value = false
  isLoading.value = false
  await fetchNodes(false)
  uni.stopPullDownRefresh()
})

// 方法
const checkLoginStatus = () => {
  const storedToken = uni.getStorageSync('token')
  const storedUsername = uni.getStorageSync('username')
  if (storedToken && storedUsername) {
    isLoggedIn.value = true
    username.value = storedUsername
    token.value = storedToken
  }
}

const fetchNodes = async (isLoadMore = false) => {
  if (!isLoggedIn.value) {
    uni.showToast({
      title: '请先登录',
      icon: 'none'
    })
    return
  }
  
  if (isLoading.value) return
  isLoading.value = true
  
  if (!isLoadMore) {
    uni.showLoading({
      title: '获取节点中...'
    })
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
    })
    
    if (res.statusCode === 200 && res.data) {
      const newNodes = res.data.nodes || res.data
      const total = res.data.total || 0
      
      if (isLoadMore) {
        nodes.value = [...nodes.value, ...newNodes]
      } else {
        nodes.value = newNodes
      }
      
      if (newNodes.length < pageSize.value || nodes.value.length >= total) {
        isBottom.value = true
      }
      
      if (!isLoadMore) {
        uni.hideLoading()
        uni.showToast({
          title: '节点获取成功',
          icon: 'success'
        })
      }
    } else {
      throw new Error('获取节点失败')
    }
  } catch (error) {
    if (!isLoadMore) {
      uni.hideLoading()
    }
    uni.showToast({
      title: '获取节点失败',
      icon: 'none'
    })
    console.error('获取节点失败:', error)
  } finally {
    isLoading.value = false
  }
}

const handleAuth = () => {
  if (isLoggedIn.value) {
    // 退出登录
    uni.removeStorageSync('token')
    uni.removeStorageSync('username')
    isLoggedIn.value = false
    token.value = ''
    nodes.value = []
    
    // 如果已连接VPN，先断开
    if (isConnected.value) {
      toggleVPN()
    }
    
    uni.showToast({
      title: '已退出登录',
      icon: 'success'
    })
  } else {
    // 跳转到登录页面
    uni.navigateTo({
      url: '/pages/login/login'
    })
  }
}

const toggleVPN = () => {
  if (!isLoggedIn.value) {
    uni.showToast({
      title: '请先登录',
      icon: 'none'
    })
    return
  }
  
  if (nodes.value.length === 0) {
    uni.showToast({
      title: '暂无可用节点',
      icon: 'none'
    })
    return
  }
  
  if (isConnected.value) {
    // 断开连接
    disconnectVPN()
  } else {
    // 连接VPN
    connectVPN()
  }
}

const connectVPN = () => {
  isConnecting.value = true
  statusText.value = '连接中...'
  connectButtonText.value = '连接中'
  
  // 先清除可能存在的旧定时器
  if (connectingInterval.value) {
    clearInterval(connectingInterval.value)
    connectingInterval.value = null
  }
  
  // 模拟连接过程
  setTimeout(() => {
    isConnecting.value = false
    isConnected.value = true
    statusText.value = '已连接'
    connectButtonText.value = '断开连接'
    
    const selectedNodeData = nodes.value[selectedNode.value]
    connectionInfo.value = `${selectedNodeData.tag} · ${selectedNodeData.host}:${selectedNodeData.port}`
    
    // 开始计时 - 确保使用正确的间隔时间
    connectionSeconds.value = 0
    updateConnectionTime()
    connectingInterval.value = setInterval(updateConnectionTime, 1000) // 确保是1000毫秒
    
    uni.showToast({
      title: 'VPN连接成功',
      icon: 'success'
    })
  }, 2000)
}

const disconnectVPN = () => {
  isConnected.value = false
  statusText.value = '未连接'
  connectButtonText.value = '连接VPN'
  connectionInfo.value = '--'
  connectionTime.value = '--'
  
  // 确保正确清除定时器
  if (connectingInterval.value) {
    clearInterval(connectingInterval.value)
    connectingInterval.value = null
  }
  
  uni.showToast({
    title: 'VPN已断开',
    icon: 'success'
  })
}

const updateConnectionTime = () => {
  connectionSeconds.value++
  const hours = Math.floor(connectionSeconds.value / 3600)
  const minutes = Math.floor((connectionSeconds.value % 3600) / 60)
  const seconds = connectionSeconds.value % 60
  
  if (hours > 0) {
    connectionTime.value = `连接时间: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  } else {
    connectionTime.value = `连接时间: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
}

const selectNode = (index) => {
  selectedNode.value = index
  if (isConnected.value) {
    const selectedNodeData = nodes.value[index]
    connectionInfo.value = `${selectedNodeData.tag} · ${selectedNodeData.host}:${selectedNodeData.port}`
  }
}

const toggleAppSelection = (index) => {
  if (index === 7) {
    // 选择全部应用
    selectedApps.value = [7]
  } else {
    if (selectedApps.value.includes(index)) {
      // 取消选择
      selectedApps.value = selectedApps.value.filter(i => i !== index)
      // 如果取消了全部选择，且没有其他选择，则选择全部应用
      if (selectedApps.value.length === 0) {
        selectedApps.value = [7]
      }
    } else {
      // 选择应用，移除"全部应用"选项如果存在
      selectedApps.value = selectedApps.value.filter(i => i !== 7)
      selectedApps.value.push(index)
    }
  }
}

const getCountryFlag = (tag) => {
  // 根据标签返回对应的国旗emoji
  const flagMap = {
    '测试-001': '🇨🇳',
    '美国': '🇺🇸',
    '日本': '🇯🇵',
    '新加坡': '🇸🇬',
    '德国': '🇩🇪',
    '英国': '🇬🇧',
    '韩国': '🇰🇷'
  }
  
  // return flagMap[tag] || '🌐'
  return '🌐'
}

const formatDate = (dateString) => {
  if (!dateString) return '未知'
  
  const date = new Date(dateString)
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
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
    justify-content: space-between; // 两端对齐
    align-items: center;
    margin-bottom: 20rpx;
    width: 100%; // 确保占据整个宽度
    
    .welcome-text {
      color: white;
      font-size: 32rpx;
      flex: 1; // 占据剩余空间
      margin-right: 20rpx; // 添加右边距
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
      flex-shrink: 0; // 防止按钮被压缩
    }
  }
  
  .app-name {
    color: white;
    font-size: 40rpx;
    font-weight: bold;
    text-align: center;
    display: block;
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

/* 状态颜色样式 */
.status-online {
  color: #4ade80 !important; // 绿色 - 在线状态
  font-weight: 600;
}

.status-offline {
  color: #9ca3af !important; // 灰色 - 离线状态
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
    
    .node-info {
      display: flex;
      align-items: center;
      
      .node-flag {
        font-size: 40rpx;
        margin-right: 20rpx;
      }
      
      .node-details {
        display: flex;
        flex-direction: column;
        
        .node-name {
          font-size: 28rpx;
          font-weight: bold;
        }
        
        .node-location {
          font-size: 24rpx;
          color: #999;
        }
      }
    }
    
    .node-ping {
      font-size: 24rpx;
      color: #666;
      padding: 6rpx 16rpx;
      background: #f5f5f5;
      border-radius: 20rpx;
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

.connection-details {
  .info-item {
    display: flex;
    justify-content: space-between;
    padding: 15rpx 0;
    border-bottom: 1rpx solid #f0f0f0;
    
    &:last-child {
      border-bottom: none;
    }
    
    .info-label {
      font-size: 28rpx;
      color: #666;
    }
    
    .info-value {
      font-size: 28rpx;
      font-weight: 500;
    }
  }
}

.footer {
  padding: 30rpx;
  text-align: center;
  
  .footer-text {
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.7);
  }
}
</style>

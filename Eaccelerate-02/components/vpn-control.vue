<template>
  <view class="card">
    <text class="card-title">VPN连接</text>
    
    <view class="connection-status">
      <text class="status-text">状态: </text>
      <view class="status-indicator" :class="isConnected ? 'connected' : 'disconnected'"></view>
      <text class="status-value">{{ isConnected ? '已连接' : '未连接' }}</text>
    </view>
    
    <view class="connection-info" v-if="isConnected">
      <view class="info-item">
        <text class="info-value">{{ connectionTime }}</text>
        <text class="info-label">连接时长</text>
      </view>
      <view class="info-item">
        <text class="info-value">{{ selectedNode.name }}</text>
        <text class="info-label">当前节点</text>
      </view>
    </view>
    
    <button 
      class="btn" 
      :class="isConnected ? 'btn-danger' : 'btn-success'" 
      @click="toggleConnection"
    >
      <text>{{ isConnected ? '断开连接' : '开启VPN' }}</text>
    </button>
  </view>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'

const isConnected = ref(false)
const connectionTime = ref('00:00:00')
const connectionTimer = ref(null)
const selectedNode = ref({ name: '美国节点' })

const toggleConnection = () => {
  if (isConnected.value) {
    disconnect()
  } else {
    connect()
  }
}

const connect = () => {
  isConnected.value = true
  
  // 启动计时器
  let seconds = 0
  connectionTimer.value = setInterval(() => {
    seconds++
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    connectionTime.value = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }, 1000)
  
  uni.showToast({
    title: 'VPN已连接',
    icon: 'success'
  })
}

const disconnect = () => {
  isConnected.value = false
  
  // 停止计时器
  if (connectionTimer.value) {
    clearInterval(connectionTimer.value)
    connectionTimer.value = null
  }
  
  connectionTime.value = '00:00:00'
  
  uni.showToast({
    title: 'VPN已断开',
    icon: 'success'
  })
}

onUnmounted(() => {
  if (connectionTimer.value) {
    clearInterval(connectionTimer.value)
  }
})
</script>

<style scoped>
.connection-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 20px;
}

.status-text {
  font-weight: 600;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.connected {
  background: #10b981;
  box-shadow: 0 0 10px #10b981;
}

.disconnected {
  background: #ef4444;
  box-shadow: 0 0 10px #ef4444;
}

.connection-info {
  display: flex;
  justify-content: space-around;
  margin: 20px 0;
  text-align: center;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-value {
  font-size: 18px;
  font-weight: 700;
}

.info-label {
  font-size: 14px;
  opacity: 0.8;
}
</style>
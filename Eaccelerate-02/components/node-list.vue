<template>
  <view class="card">
    <text class="card-title">节点列表</text>
    
    <view class="loading" v-if="loading">
      <text>加载中...</text>
    </view>
    
    <view class="error-message" v-if="error">
      {{ error }}
    </view>
    
    <view class="node-list" v-else>
      <view 
        v-for="node in nodes" 
        :key="node.id" 
        class="node-item" 
        :class="{ selected: selectedNode.id === node.id }"
        @click="selectNode(node)"
      >
        <text class="node-flag">{{ node.flag }}</text>
        <view class="node-info">
          <text class="node-name">{{ node.name }}</text>
          <text class="node-stats">延迟: {{ node.ping }}ms | 负载: {{ node.load }}%</text>
        </view>
        <view v-if="selectedNode.id === node.id" class="node-selected">
          <text class="icon">✓</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'

const nodes = ref([])
const selectedNode = reactive({ id: 1, name: '美国节点' })
const loading = ref(false)
const error = ref('')

const selectNode = (node) => {
  selectedNode.id = node.id
  selectedNode.name = node.name
  
  uni.showToast({
    title: `已选择: ${node.name}`,
    icon: 'success'
  })
}

// 组件挂载时获取节点列表
onMounted(async () => {
  const token = uni.getStorageSync('token')
  if (!token) return
  
  loading.value = true
  error.value = ''
  
  try {
    const response = await uni.request({
      url: 'http://124.223.21.69/api/nodes',
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (response.statusCode === 200 && Array.isArray(response.data)) {
      // 为节点添加国旗emoji和模拟数据
      const flags = ['🇺🇸', '🇯🇵', '🇩🇪', '🇸🇬', '🇭🇰']
      nodes.value = response.data.map((node, index) => ({
        ...node,
        // flag: flags[index % flags.length],
        ping: Math.floor(Math.random() * 100) + 30,
        load: Math.floor(Math.random() * 50) + 10
      }))
      
      if (nodes.value.length > 0) {
        selectedNode.id = nodes.value[0].id
        selectedNode.name = nodes.value[0].name
      }
    } else {
      error.value = '获取节点失败：无效的响应格式'
    }
  } catch (err) {
    console.error('Fetch nodes error:', err)
    if (err.statusCode === 401) {
      error.value = '认证失败，请重新登录'
    } else {
      error.value = '获取节点失败：网络错误或服务器无响应'
    }
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.node-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}

.node-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  transition: all 0.3s;
}

.node-item.selected {
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid rgba(16, 185, 129, 0.5);
}

.node-item:active {
  background: rgba(255, 255, 255, 0.12);
}

.node-flag {
  font-size: 28px;
  margin-right: 16px;
}

.node-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.node-name {
  font-weight: 600;
  font-size: 16px;
}

.node-stats {
  font-size: 12px;
  opacity: 0.8;
}

.node-selected {
  color: #10b981;
  font-weight: bold;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.error-message {
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.5);
  padding: 12px;
  border-radius: 8px;
  margin-top: 16px;
  font-size: 14px;
}
</style>
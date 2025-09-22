<template>
  <view class="card">
    <text class="card-title">应用选择</text>
    <text class="card-subtitle">选择需要VPN加速的应用</text>
    
    <view class="app-list">
      <view 
        v-for="app in apps" 
        :key="app.id" 
        class="app-item" 
        :class="{ selected: selectedApp.id === app.id }"
        @click="selectApp(app)"
      >
        <text class="app-icon">{{ app.icon }}</text>
        <text class="app-name">{{ app.name }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue'

const apps = ref([
  { id: 1, name: '全部应用', icon: '📱' },
  { id: 2, name: '游戏', icon: '🎮' },
  { id: 3, name: '视频', icon: '📺' },
  { id: 4, name: '浏览器', icon: '🌐' },
  { id: 5, name: '社交', icon: '💬' },
  { id: 6, name: '工作', icon: '💼' }
])

const selectedApp = reactive({ id: 1, name: '全部应用' })

const selectApp = (app) => {
  selectedApp.id = app.id
  selectedApp.name = app.name
  
  uni.showToast({
    title: `已选择: ${app.name}`,
    icon: 'success'
  })
}
</script>

<style scoped>
.card-subtitle {
  display: block;
  margin-bottom: 16px;
  opacity: 0.8;
  font-size: 14px;
}

.app-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.app-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  transition: all 0.3s;
}

.app-item.selected {
  background: rgba(99, 102, 241, 0.2);
  border: 1px solid rgba(99, 102, 241, 0.5);
}

.app-item:active {
  background: rgba(255, 255, 255, 0.12);
}

.app-icon {
  font-size: 24px;
}

.app-name {
  font-size: 12px;
  text-align: center;
}
</style>
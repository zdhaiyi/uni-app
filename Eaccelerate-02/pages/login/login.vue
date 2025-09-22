<template>
  <view class="login-container">
    <view class="header">
      <view class="logo">
        <text class="icon">🔒</text>
        <text class="text">SecureVPN</text>
      </view>
      <text class="subtitle">安全连接，保护您的隐私</text>
    </view>

    <view class="card login-card">
      <text class="card-title">用户登录</text>
      
      <view class="form-group">
        <text class="label">用户名</text>
        <input 
          class="input" 
          type="text" 
          placeholder="请输入用户名" 
          v-model="username"
          placeholder-style="color: rgba(255, 255, 255, 0.6)"
        />
      </view>
      
      <view class="form-group">
        <text class="label">密码</text>
        <input 
          class="input" 
          type="password" 
          placeholder="请输入密码" 
          v-model="password"
          placeholder-style="color: rgba(255, 255, 255, 0.6)"
        />
      </view>
      
      <button class="btn btn-primary" @click="handleLogin" :disabled="loading">
        <text v-if="!loading">登录</text>
        <text v-else>登录中...</text>
      </button>
      
      <view class="error-message" v-if="error">
        {{ error }}
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

const username = ref('test123')
const password = ref('test123')
const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  if (!username.value || !password.value) {
    error.value = '请输入用户名和密码'
    return
  }
  
  loading.value = true
  error.value = ''
  
  try {
    // 调用登录API
    const response = await uni.request({
      url: 'http://124.223.21.69/api/users/login',
      method: 'POST',
      data: {
        username: username.value,
        password: password.value
      },
      header: {
        'Content-Type': 'application/json'
      }
    })
    
    if (response.statusCode === 200 && response.data.token) {
      // 存储token和登录状态
      uni.setStorageSync('token', response.data.token)
      uni.setStorageSync('isLoggedIn', true)
      uni.setStorageSync('username', username.value)
      
      uni.showToast({
        title: '登录成功',
        icon: 'success'
      })
      
      // 跳转到首页
      setTimeout(() => {
        uni.switchTab({
          url: '/pages/index/index'
        })
      }, 1500)
    } else {
      error.value = response.data.message || '登录失败'
    }
  } catch (err) {
    console.error('Login error:', err)
    error.value = '登录失败，请检查网络连接'
  } finally {
    loading.value = false
  }
}

onLoad(() => {
  // 检查是否已登录
  const isLoggedIn = uni.getStorageSync('isLoggedIn')
  if (isLoggedIn) {
    uni.switchTab({
      url: '/pages/index/index'
    })
  }
})
</script>

<style scoped>
.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
}

.header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 40px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.logo .icon {
  font-size: 32px;
}

.logo .text {
  font-size: 28px;
  font-weight: 700;
}

.subtitle {
  opacity: 0.85;
  font-size: 16px;
}

.login-card {
  width: 100%;
  max-width: 400px;
}

.card-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 24px;
  display: block;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.label {
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
}

.input {
  padding: 16px;
  border: none;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.12);
  color: white;
  font-size: 16px;
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
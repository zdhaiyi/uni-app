<template>
  <view class="container">
    <view class="header">
      <!-- 用户信息部分 -->
      <view class="user-info">
        <view class="user-avatar">
          <text>{{ userInitial }}</text>
        </view>
        <view class="user-details">
          <text class="username">欢迎, {{ username }}</text>
          <text class="user-status">VIP用户</text>
        </view>
      </view>
      <view class="logout-btn" @click="handleLogout">
        <text class="icon">🚪</text>
        <text class="text">退出</text>
      </view>
    </view>

    <!-- 直接使用组件，无需导入 -->
    <vpn-control></vpn-control>
    <node-list></node-list>
    <app-select></app-select>
  </view>
</template>

<script>
// 不再需要手动导入组件
export default {
  data() {
    return {
      username: ''
    };
  },
  computed: {
    userInitial() {
      return this.username ? this.username.charAt(0).toUpperCase() : 'U';
    }
  },
  methods: {
    handleLogout() {
      uni.showModal({
        title: '确认退出',
        content: '您确定要退出登录吗？',
        success: (res) => {
          if (res.confirm) {
            // 清除登录状态
            uni.removeStorageSync('isLoggedIn');
            uni.removeStorageSync('token');
            uni.removeStorageSync('username');
            
            // 跳转到登录页
            uni.redirectTo({
              url: '/pages/login/login'
            });
          }
        }
      });
    }
  },
  onLoad() {
    // 获取用户名
    this.username = uni.getStorageSync('username') || '用户';
  }
};
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #818cf8);
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 20px;
  font-weight: 600;
}

.user-details {
  display: flex;
  flex-direction: column;
}

.username {
  font-weight: 600;
  font-size: 16px;
}

.user-status {
  font-size: 12px;
  opacity: 0.8;
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
</style>

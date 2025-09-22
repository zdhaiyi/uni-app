<script setup>
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'

// 应用启动
onLaunch(() => {
  console.log('App Launch')
  // 检查本地存储中是否有登录信息
  const token = uni.getStorageSync('token')
  if (token) {
    // 如果有token，跳转到首页
    uni.reLaunch({
      url: '/pages/index/index'
    })
  }
})

// 应用显示
  console.log('App Show')

// 应用隐藏
onHide(() => {
  console.log('App Hide')
})
</script>

<style>
/* 全局样式 */
page {
  background-color: #f8f9fa;
  font-size: 28rpx;
  color: #333;
}

.container {
  padding: 30rpx;
}

.card {
  background: #fff;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
  margin-bottom: 30rpx;
  overflow: hidden;
}

.btn {
  padding: 20rpx 30rpx;
  border-radius: 16rpx;
  font-size: 28rpx;
  text-align: center;
  border: none;
  outline: none;
  
  &-primary {
    background: #4361ee;
    color: #fff;
  }
  
  &-disabled {
    background: #ccc;
    color: #fff;
  }
}
</style>

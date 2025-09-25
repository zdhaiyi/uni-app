<script>
export default {
    // Vue2 应用生命周期
    onLaunch: function() {
        console.log('App Launch - Vue2 Version')
        // 检查本地存储中是否有登录信息
        const token = uni.getStorageSync('token')
        if (token) {
            console.log('检测到已登录，跳转到首页')
            uni.reLaunch({
                url: '/pages/index/index'
            })
        } else {
            console.log('未检测到登录信息')
        }
    },
    
    onShow: function() {
        console.log('App Show')
    },
    
    onHide: function() {
        console.log('App Hide')
    },
    
    // Vue2 组件选项
    data() {
        return {
            // 可以在这里定义全局数据
        }
    },
    
    methods: {
        // 可以在这里定义全局方法
    }
}
</script>

<style>
/* 全局样式 */
page {
  background-color: #f8f9fa;
  font-size: 28rpx;
  color: #333;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, 
               'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 
               SimSun, sans-serif;
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
}

.btn-primary {
  background: #4361ee;
  color: #fff;
}

.btn-disabled {
  background: #ccc;
  color: #fff;
}

/* 重置默认样式 */
* {
  box-sizing: border-box;
}

button {
  margin: 0;
  padding: 0;
  background: none;
  border: none;
  outline: none;
}

button::after {
  border: none;
}

input {
  outline: none;
  border: none;
}
</style>
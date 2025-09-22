import { createSSRApp } from 'vue'
import App from './App.vue'

// 导入uni-app样式
// import '@/static/css/common.css'

export function createApp() {
  const app = createSSRApp(App)
  
  // 在这里可以添加全局配置
  app.config.globalProperties.$filters = {
    formatTime(value) {
      // 时间格式化过滤器
      return new Date(value).toLocaleString()
    }
  }
  
  return {
    app
  }
}
import Vue from 'vue'
import App from './App'

// 关闭生产提示
Vue.config.productionTip = false

// 设置为应用类型
App.mpType = 'app'

// 创建Vue实例
const app = new Vue({
    // 扩展App配置
    ...App
})

// 挂载应用
app.$mount()

// 可选：全局错误处理
Vue.config.errorHandler = function (err, vm, info) {
    console.error('Vue错误:', err, info)
}
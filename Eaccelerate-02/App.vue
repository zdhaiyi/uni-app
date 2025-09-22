<script>
	export default {
		onLaunch: function() {
			console.log('App Launch')
			// 检查登录状态
			this.checkLoginStatus()
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		},
		methods: {
			checkLoginStatus() {
				// 从本地存储获取登录状态
				const isLoggedIn = uni.getStorageSync('isLoggedIn')
				const token = uni.getStorageSync('token')

				if (!isLoggedIn || !token) {
					// 未登录，跳转到登录页
					uni.redirectTo({
						url: '/pages/login/login'
					})
				}
			}
		}
	}
</script>

<style>
	/* 全局样式 */
	page {
		background: linear-gradient(135deg, #1a2a6c 0%, #b21f1f 50%, #fdbb2d 100%);
		color: #fff;
		min-height: 100vh;
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
	}
	.container {
		display: flex;
		flex-direction: column;
		padding: 20px;
		gap: 24px;
	}

	.card {
		background: rgba(255, 255, 255, 0.08);
		backdrop-filter: blur(12px);
		border-radius: 20px;
		padding: 24px;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
		border: 1px solid rgba(255, 255, 255, 0.12);
	}

	.btn {
		padding: 16px 24px;
		border: none;
		border-radius: 12px;
		color: white;
		font-size: 16px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s;
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 8px;
	}

	.btn-primary {
		background: linear-gradient(135deg, #6366f1, #818cf8);
	}

	.btn-success {
		background: linear-gradient(135deg, #10b981, #34d399);
	}

	.btn-danger {
		background: linear-gradient(135deg, #ef4444, #f87171);
	}

	.btn-sm {
		padding: 10px 16px;
		font-size: 14px;
	}
</style>
<template>
	<view class="login-container">
		<view class="login-header">
			<view class="title-container">
				<image class="title-icon" src="/static/icon.ico" mode="aspectFit"></image>
				<text class="login-title">e加速</text>
			</view>
			<text class="login-subtitle">请登录您的VPN账户</text>
		</view>

		<view class="login-form">
			<view class="input-group">
				<text class="input-label">用户名</text>
				<input class="input-field" type="text" v-model="username" placeholder="请输入用户名" />
			</view>

			<view class="input-group">
				<text class="input-label">密码</text>
				<input class="input-field" type="password" v-model="password" placeholder="请输入密码" />
			</view>

			<button class="btn-login" @click="handleLogin">登录</button>

			<view class="login-tips">
				<!-- <text>测试账号: test123 / test123</text> -->
			</view>
		</view>
	</view>
</template>

<script setup>
	import {
		ref
	} from 'vue'

	const username = ref('test_pan_1234')
	const password = ref('123456')

	const handleLogin = async () => {
		if (!username.value || !password.value) {
			return uni.showToast({
				title: '请输入用户名和密码',
				icon: 'none'
			})
		}
		uni.showLoading({
			title: '登录中...'
		})
		try {
			const res = await uni.request({
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
			if (res.statusCode === 200 && res.data) {
				const token = res.data.token || res.data.accessToken
				if (!token) throw new Error('未返回 token')
				uni.setStorageSync('token', token)
				uni.setStorageSync('username', username.value)
				uni.showToast({
					title: '登录成功',
					icon: 'success'
				})
				setTimeout(() => {
					uni.reLaunch({
						url: '/pages/index/index'
					})
				}, 500)
			} else {
				throw new Error(res.data?.message || '登录失败')
			}
		} catch (e) {
			uni.showToast({
				title: e.message || '登录失败',
				icon: 'none'
			})
		} finally {
			uni.hideLoading()
		}
	}
</script>

<style lang="scss" scoped>
	.login-container {
		background: linear-gradient(135deg, #1a2a6c, #b21f1f, #fdbb2d);
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.login-header {
		text-align: center;
		margin-bottom: 80rpx;

		.title-container {
			justify-content: center;
			align-items: center;
			margin-bottom: 20rpx;

			.login-title {
				font-size: 48rpx;
				font-weight: bold;
				color: white;
				margin-right: 15rpx;
				/* 标题和图标之间的间距 */
			}

			.title-icon {
				width: 50rpx;
				/* 根据您的图标大小调整 */
				height: 50rpx;
				/* 根据您的图标大小调整 */
			}
		}

		.login-subtitle {
			color: rgba(255, 255, 255, 0.8);
			font-size: 28rpx;
		}
	}

	.login-form {
		background: white;
		border-radius: 20rpx;
		padding: 50rpx 40rpx;
		box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.1);

		.input-group {
			margin-bottom: 40rpx;

			.input-label {
				display: block;
				font-size: 28rpx;
				margin-bottom: 15rpx;
				color: #333;
			}

			.input-field {
				border: 1rpx solid #ddd;
				border-radius: 12rpx;
				padding: 20rpx;
				font-size: 28rpx;
			}
		}

		.btn-login {
			background: linear-gradient(to right, #4361ee, #3a0ca3);
			color: white;
			border: none;
			border-radius: 50rpx;
			padding: 25rpx;
			font-size: 32rpx;
			margin-top: 20rpx;
		}

		.login-tips {
			text-align: center;
			margin-top: 40rpx;
			color: #999;
			font-size: 24rpx;
		}
	}

	.login-footer {
		text-align: center;
		margin-top: 60rpx;

		.footer-text {
			color: rgba(255, 255, 255, 0.7);
			font-size: 24rpx;
		}
	}

	@media (max-width: 480px) {
		.login-container {
			padding-left: 20rpx;
			padding-right: 20rpx;
		}

		.login-form {
			padding: 30rpx 20rpx;
		}

		.login-header {
			margin-bottom: 40rpx;
		}
	}
</style>
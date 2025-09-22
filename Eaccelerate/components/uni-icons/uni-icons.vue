<template>
  <view class="uni-icons" :class="[type ? 'uni-icons-' + type : '']" :style="{ color: color, 'font-size': size + 'rpx' }">
    <text v-if="type === 'compass'">🧭</text>
    <text v-else-if="type === 'chat'">💬</text>
    <text v-else-if="type === 'chatboxes'">📨</text>
    <text v-else-if="type === 'personadd'">👤</text>
    <text v-else-if="type === 'camera'">📷</text>
    <text v-else-if="type === 'person'">👥</text>
    <text v-else-if="type === 'game'">🎮</text>
    <text v-else-if="type === 'more'">⋯</text>
    <text v-else-if="type === 'refresh'">🔄</text>
    <text v-else>❓</text>
  </view>
</template>

<script setup>
defineProps({
  type: {
    type: String,
    default: ''
  },
  size: {
    type: [Number, String],
    default: 32
  },
  color: {
    type: String,
    default: '#333'
  }
})
</script>

<style scoped>
.uni-icons {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
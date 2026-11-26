<script setup lang="ts">
import { computed } from 'vue'
import { LifecycleStatus } from '@/types'

const props = defineProps<{
  status: LifecycleStatus
  text: string
}>()

const color = computed(() => {
  switch (props.status) {
    case LifecycleStatus.Draft:
      return '#DC2626'
    case LifecycleStatus.Review:
      return '#FBBF24'
    case LifecycleStatus.Published:
      return '#65A30D'
    case LifecycleStatus.Running:
      return '#2563EB'
    case LifecycleStatus.Finished:
      return '#7C3AED'
    case LifecycleStatus.Closed:
    case LifecycleStatus.Archived:
    default:
      return '#52525B'
  }
})
</script>

<template>
  <div class="event-list-item">
    <StatusDot :color="color" />
    <div class="text">{{ text }}</div>
  </div>
</template>

<style scoped>
.event-list-item {
  display: flex;
  align-items: center;
}

.text {
  margin-left: 8px;
}
</style>

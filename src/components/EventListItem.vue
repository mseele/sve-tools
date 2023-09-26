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
  <div class="d-flex align-center">
    <svg xmlns="http://www.w3.org/2000/svg" width="16pt" height="21.333">
      <path d="M15.625 10a5.625 5.625 0 11-11.25 0 5.625 5.625 0 0111.25 0z" :fill="color" />
    </svg>
    <div class="ml-2">{{ text }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{ path: string; size?: number | string; color?: string }>(),
  { size: 24 }
)
const px = computed(() => (typeof props.size === 'number' ? `${props.size}px` : props.size))
</script>

<template>
  <svg :width="px" :height="px" viewBox="0 0 24 24" role="img" aria-hidden="true">
    <path :d="props.path" fill="currentColor" />
  </svg>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{ values: number[]; width?: number; height?: number; color?: string }>(),
  { width: 150, height: 30, color: 'rgba(var(--v-theme-primary), 0.75)' }
)

function bars(): { x: number; y: number; w: number; h: number }[] {
  const max = Math.max(1, ...props.values)
  const n = props.values.length || 1
  const bw = props.width / n
  return props.values.map((v, i) => {
    const h = v === 0 ? 1 : Math.max(3, Math.round((v / max) * (props.height - 3)))
    return { x: i * bw + 1, y: props.height - h, w: Math.max(1, bw - 2), h }
  })
}
</script>

<template>
  <svg :width="props.width" :height="props.height" role="img" aria-label="Buchungstrend">
    <rect
      v-for="(b, i) in bars()"
      :key="i"
      :x="b.x"
      :y="b.y"
      :width="b.w"
      :height="b.h"
      :fill="props.color"
      rx="1"
    />
  </svg>
</template>

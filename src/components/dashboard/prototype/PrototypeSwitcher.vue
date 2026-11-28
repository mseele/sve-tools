<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { mdiChevronLeft, mdiChevronRight } from '@mdi/js'

const props = defineProps<{
  variants: { key: string; label: string }[]
  current: string
}>()

const emit = defineEmits<{ select: [key: string] }>()

function cycle(direction: 1 | -1) {
  const index = props.variants.findIndex((v) => v.key === props.current)
  const next = (index + direction + props.variants.length) % props.variants.length
  emit('select', props.variants[next].key)
}

function onKey(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  if (
    target &&
    (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
  ) {
    return
  }
  if (event.key === 'ArrowRight') cycle(1)
  if (event.key === 'ArrowLeft') cycle(-1)
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))

const label = () => props.variants.find((v) => v.key === props.current)?.label ?? ''
</script>

<template>
  <v-sheet
    class="d-flex align-center ga-1 pa-2 rounded-xl"
    color="grey-darken-4"
    elevation="12"
    style="position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); z-index: 9999"
  >
    <v-btn icon size="small" variant="text" @click="cycle(-1)">
      <v-icon>{{ mdiChevronLeft }}</v-icon>
    </v-btn>
    <span class="text-body-2 text-white mx-1">
      <b>{{ props.current || 'PR' }}</b> · {{ label() }}
    </span>
    <v-btn icon size="small" variant="text" @click="cycle(1)">
      <v-icon>{{ mdiChevronRight }}</v-icon>
    </v-btn>
  </v-sheet>
</template>

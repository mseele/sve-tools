<script setup lang="ts">
defineProps<{
  color: string
}>()
</script>

<template>
  <svg xmlns="http://www.w3.org/2000/svg" width="16pt" height="21.333">
    <path d="M15.625 10a5.625 5.625 0 11-11.25 0 5.625 5.625 0 0111.25 0z" :fill="color" />
  </svg>
</template>

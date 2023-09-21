<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useHead } from '@unhead/vue'

useHead({
  titleTemplate: (title?: string) => (!title ? 'SVE Tools' : `${title} - SVE Tools`)
})
</script>

<template>
  <RouterView />
</template>

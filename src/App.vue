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

<style>
@layer vuetify-core.reset {
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    margin: 0;
  }
}
</style>

<script setup lang="ts">
import { EventType } from '@/types'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue?: EventType
    disabled?: boolean
  }>(),
  {
    value: EventType.Fitness,
    disabled: false
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: EventType]
}>()

const selectedType = computed({
  get: () => props.modelValue!,
  set: (value) => emit('update:modelValue', value)
})
</script>

<template>
  <v-tabs
    v-model="selectedType"
    color="primary"
    align-tabs="center"
    density="comfortable"
    class="mb-4"
  >
    <v-tab v-for="item in Object.keys(EventType)" :key="item" :value="item" :disabled="disabled">
      {{ item }}
    </v-tab>
  </v-tabs>
</template>

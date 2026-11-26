<script setup lang="ts">
import { EventType } from '@/types'
import { computed } from 'vue'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import Tabs from 'primevue/tabs'

const props = withDefaults(
  defineProps<{
    modelValue?: EventType
    disabled?: boolean
  }>(),
  {
    disabled: false
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: EventType]
}>()

const selectedType = computed(() => props.modelValue!)

function select(value: string | number) {
  emit('update:modelValue', value as EventType)
}
</script>

<template>
  <Tabs :value="selectedType" class="event-type-selection" @update:value="select">
    <TabList>
      <Tab v-for="item in Object.keys(EventType)" :key="item" :value="item" :disabled="disabled">
        {{ item }}
      </Tab>
    </TabList>
  </Tabs>
</template>

<style scoped>
.event-type-selection {
  margin-bottom: 16px;
}

.event-type-selection :deep(.p-tablist-tab-list) {
  justify-content: center;
}
</style>

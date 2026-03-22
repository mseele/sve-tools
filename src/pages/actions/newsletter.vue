<script setup lang="ts">
import { getNewsletterSubscribers } from '@/api'
import { useNotifyStore } from '@/stores/notify'
import { NewsTopic } from '@/types'
import { useHead } from '@unhead/vue'
import { computed, ref, watch } from 'vue'

const title = 'Manage Newsletter'
useHead({ title })

const notify = useNotifyStore()

const selectedTopics = ref<NewsTopic[]>([])
const subscribers = ref<string[]>()
const loading = ref(false)

const allTopics = Object.values(NewsTopic)

const topicLabels: Record<NewsTopic, string> = {
  General: 'Allgemein',
  Events: 'Events',
  Fitness: 'Fitness'
}

const emailBlocks = computed(() => {
  if (!subscribers.value) return []
  const emails = [...new Set(subscribers.value)]
  const blocks: string[][] = []
  for (let i = 0; i < emails.length; i += 300) {
    blocks.push(emails.slice(i, i + 300))
  }
  return blocks
})

watch(selectedTopics, async (topics) => {
  subscribers.value = undefined
  if (topics.length === 0) return
  loading.value = true
  try {
    subscribers.value = await getNewsletterSubscribers(topics)
  } catch (error) {
    if (error !== null) {
      console.error(error)
      notify.showError('Abholen der Newsletter-Abonnenten fehlgeschlagen. Details siehe Console')
    }
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <ActionsLayout
    :title="title"
    :help="[
      'Newsletter-Themen auswählen',
      'Abonnenten werden automatisch abgerufen',
      'Email-Adressen kopieren und ins Email-Tool einfügen'
    ]"
  >
    <v-row>
      <v-col cols="12">
        <v-autocomplete
          v-model="selectedTopics"
          :items="allTopics"
          :item-title="(t: NewsTopic) => topicLabels[t] || t"
          :item-value="(t: NewsTopic) => t"
          variant="outlined"
          label="Themen auswählen"
          multiple
          chips
          closable-chips
          hide-details
        />
        <v-progress-linear v-if="loading" indeterminate color="primary" class="my-4" />
        <template v-if="emailBlocks.length > 0">
          <p class="mt-4">{{ emailBlocks.flat().length }} Adressen insgesamt</p>
          <div v-for="(block, index) in emailBlocks" :key="index" class="mt-4">
            <v-textarea
              :model-value="block.join('; ')"
              :label="`Block ${index + 1} (${block.length} Adressen)`"
              variant="outlined"
              readonly
              auto-grow
              rows="2"
              @click="($event.target as HTMLTextAreaElement).select()"
            />
          </div>
        </template>
        <p v-else-if="subscribers" class="text-medium-emphasis mt-4">Keine Abonnenten</p>
      </v-col>
    </v-row>
  </ActionsLayout>
</template>

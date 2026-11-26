<script setup lang="ts">
import { getNewsletterSubscribers } from '@/api'
import { useNotifyStore } from '@/stores/notify'
import { NewsTopic } from '@/types'
import { useHead } from '@unhead/vue'
import IftaLabel from 'primevue/iftalabel'
import MultiSelect from 'primevue/multiselect'
import ProgressBar from 'primevue/progressbar'
import Textarea from 'primevue/textarea'
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
    <IftaLabel>
      <MultiSelect
        inputId="newsletter-topics"
        v-model="selectedTopics"
        :options="allTopics"
        :optionLabel="(t: NewsTopic) => topicLabels[t] || t"
        display="chip"
        fluid
      />
      <label for="newsletter-topics">Themen auswählen</label>
    </IftaLabel>
    <ProgressBar v-if="loading" mode="indeterminate" class="loading-bar" />
    <template v-if="emailBlocks.length > 0">
      <p class="total">{{ emailBlocks.flat().length }} Adressen insgesamt</p>
      <div v-for="(block, index) in emailBlocks" :key="index" class="email-block">
        <IftaLabel>
          <Textarea
            :inputId="`newsletter-block-${index}`"
            :modelValue="block.join('; ')"
            rows="2"
            autoResize
            readonly
            fluid
            @click="($event.target as HTMLTextAreaElement).select()"
          />
          <label :for="`newsletter-block-${index}`">
            {{ `Block ${index + 1} (${block.length} Adressen)` }}
          </label>
        </IftaLabel>
      </div>
    </template>
    <p v-else-if="subscribers" class="empty">Keine Abonnenten</p>
  </ActionsLayout>
</template>

<style scoped>
.loading-bar {
  margin-block: 16px;
  height: 6px;
}

.total {
  margin-top: 16px;
}

.email-block {
  margin-top: 16px;
}

.empty {
  margin-top: 16px;
  color: rgba(0, 0, 0, 0.6);
}
</style>

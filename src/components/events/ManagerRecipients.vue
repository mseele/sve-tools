<script setup lang="ts">
import { mdiPlus } from '@mdi/js'
import Button from 'primevue/button'
import Chip from 'primevue/chip'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import { computed, ref, useId, watch } from 'vue'

const props = defineProps<{
  modelValue: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [recipients: string[]]
}>()

const uid = useId()
const showAddDialog = ref(false)
const emailToAdd = ref('')

const emailAddressPattern =
  /^[A-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i

function isValidEmailAddress(value: string) {
  return value.length <= 254 && emailAddressPattern.test(value)
}

const emailError = computed(() => {
  if (emailToAdd.value.length === 0) {
    return undefined
  }
  return isValidEmailAddress(emailToAdd.value)
    ? undefined
    : 'Bitte gib eine gültige E-Mail-Adresse ein'
})

watch(showAddDialog, (show) => {
  if (show) {
    emailToAdd.value = ''
  }
})

function onAdd() {
  if (!isValidEmailAddress(emailToAdd.value)) {
    return
  }
  emit('update:modelValue', [...props.modelValue, emailToAdd.value])
  emailToAdd.value = ''
  showAddDialog.value = false
}

function onCancel() {
  emailToAdd.value = ''
  showAddDialog.value = false
}

function onRemove(index: number) {
  const recipients = [...props.modelValue]
  recipients.splice(index, 1)
  emit('update:modelValue', recipients)
}
</script>

<template>
  <div>
    <div class="recipients-box">
      <span class="recipients-label">Empfänger für Manager-Erinnerungen</span>
      <div class="recipients-chips">
        <Chip
          v-for="(email, index) in modelValue"
          :key="email"
          :label="email"
          removable
          @remove="onRemove(index)"
        />
        <Button
          text
          rounded
          severity="secondary"
          aria-label="Empfänger hinzufügen"
          @click="showAddDialog = true"
        >
          <MdiIcon :path="mdiPlus" :size="20" />
        </Button>
      </div>
    </div>
    <Dialog
      v-model:visible="showAddDialog"
      modal
      header="Empfänger hinzufügen"
      :style="{ width: '500px' }"
    >
      <IftaLabel>
        <InputText
          :id="`${uid}-email`"
          v-model="emailToAdd"
          type="email"
          autofocus
          fluid
          :invalid="emailError !== undefined"
          @keyup.enter="onAdd()"
        />
        <label :for="`${uid}-email`">E-Mail-Adresse</label>
      </IftaLabel>
      <div v-if="emailError" class="field-error">{{ emailError }}</div>
      <template #footer>
        <Button label="Abbrechen" text @click="onCancel()" />
        <Button
          label="Hinzufügen"
          text
          :disabled="!isValidEmailAddress(emailToAdd)"
          @click="onAdd()"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.recipients-box {
  border: 1px solid rgba(0, 0, 0, 0.38);
  border-radius: 4px;
  width: 100%;
}

.recipients-label {
  display: block;
  font-size: 0.875rem;
  line-height: 1.5;
  padding: 6px 12px 2px;
  color: rgba(0, 0, 0, 0.6);
}

.recipients-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 4px 12px 8px;
}

.field-error {
  color: var(--p-red-500, #f44336);
  font-size: 0.75rem;
  padding-top: 2px;
}
</style>

<script setup lang="ts">
import { mdiPlus } from '@mdi/js'
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [recipients: string[]]
}>()

const showAddDialog = ref(false)
const emailToAdd = ref('')

const emailAddressPattern =
  /^[A-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i

function isValidEmailAddress(value: string) {
  return value.length <= 254 && emailAddressPattern.test(value)
}

const rules = {
  managerRecipientEmail: [
    (val: string) => isValidEmailAddress(val) || 'Bitte gib eine gültige E-Mail-Adresse ein'
  ]
}

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
    <v-input density="compact" hide-details>
      <v-field variant="outlined" label="Empfänger für Manager-Erinnerungen" active>
        <template v-slot:default="{ props: fieldProps }">
          <div v-bind="fieldProps">
            <v-chip
              v-for="(email, index) in modelValue"
              :key="email"
              class="mr-2"
              size="small"
              label
              closable
              color="primary"
              @click:close="onRemove(index)"
            >
              {{ email }}
            </v-chip>
          </div>
        </template>
        <template v-slot:append-inner>
          <v-btn
            icon
            variant="text"
            size="small"
            color="primary"
            aria-label="Empfänger hinzufügen"
            @click="showAddDialog = true"
          >
            <v-icon>{{ mdiPlus }}</v-icon>
          </v-btn>
        </template>
      </v-field>
    </v-input>
    <v-dialog v-model="showAddDialog" max-width="500">
      <v-card>
        <v-card-title class="text-h5">Empfänger hinzufügen</v-card-title>
        <v-card-text class="pb-0">
          <v-text-field
            label="E-Mail-Adresse"
            type="email"
            variant="outlined"
            density="compact"
            autofocus
            v-model="emailToAdd"
            :rules="rules.managerRecipientEmail"
            @keyup.enter="onAdd()"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" variant="text" @click="onCancel()">Abbrechen</v-btn>
          <v-btn
            color="primary"
            variant="text"
            :disabled="!isValidEmailAddress(emailToAdd)"
            @click="onAdd()"
          >
            Hinzufügen
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<template>
  <div class="d-flex align-center">
    <div v-if="!disabled && people.length > 0">
      {{
        people.length +
        (people.length == 1
          ? ' Email wird versandt'
          : ' Emails werden verstandt')
      }}
    </div>
    <v-progress-circular
      v-if="disabled"
      size="32"
      rotate="-90"
      indeterminate
      color="light-blue"
    ></v-progress-circular>
    <v-spacer />
    <v-btn depressed :disabled="disabled" @click="reset()">
      Zurücksetzen
    </v-btn>
    <v-btn
      v-if="sendVisible"
      depressed
      :color="confirmSend ? 'red' : 'primary'"
      :disabled="disabled"
      class="ml-2"
      @click="send()"
    >
      {{ confirmSend ? 'Sicher?' : sendText }}
    </v-btn>
  </div>
</template>

<script>
export default {
  props: {
    disabled: {
      type: Boolean,
      default: false,
    },
    people: {
      type: Array,
      default: () => [],
    },
    sendText: {
      type: String,
      default: 'Senden',
    },
    sendVisible: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      confirmSend: false,
    }
  },
  methods: {
    reset() {
      this.confirmSend = false
      this.$emit('reset')
    },
    async send() {
      if (!this.confirmSend) {
        this.confirmSend = true
        return
      }
      this.confirmSend = false
      this.$emit('send')
    },
  },
}
</script>

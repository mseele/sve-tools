<template>
  <v-radio-group v-model="type">
    <v-radio
      v-for="item in types"
      :key="item"
      :label="item"
      :value="item"
      :disabled="disabled"
    ></v-radio>
  </v-radio-group>
</template>

<script>
export default {
  props: {
    value: {
      type: String,
      default: 'Fitness',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      type: this.value,
      types: ['Fitness', 'Events'],
    }
  },
  mounted() {
    this.onChange(this.value)
  },
  watch: {
    type(newValue) {
      this.onChange(newValue)
    },
  },
  methods: {
    onChange(newValue) {
      if (newValue === 'Fitness') {
        this.selectFitness()
      } else {
        this.selectEvents()
      }
    },
    selectFitness() {
      this.select({
        subject: '[Fitness@SVE] ',
        content: `

Herzliche Grüße
Team Fitness@SVE`,
      })
    },
    selectEvents() {
      this.select({
        subject: '[Events@SVE] ',
        content: `

Herzliche Grüße
Team Events@SVE`,
      })
    },
    select(preset) {
      this.$emit('input', this.type)
      this.$emit('change', preset)
    },
    reset() {
      this.from = 'Fitness'
      this.selectFitness()
    },
  },
}
</script>

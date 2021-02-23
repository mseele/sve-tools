<template>
  <v-row>
    <v-col cols="12">
      <div class="text-h5 text-center">{{ title }}</div>
      <div class="text-overline text-center">
        <div class="d-flex justify-center align-center">
          <div class="mr-1">{{ subtitle }}</div>
          <v-bottom-sheet v-if="help.length > 0" v-model="helpToggle" inset>
            <template v-slot:activator="{ on, attrs }">
              <v-btn x-small icon color="green" v-bind="attrs" v-on="on">
                <v-icon>{{ mdiHelpCircle }}</v-icon>
              </v-btn>
            </template>
            <v-sheet>
              <div class="text-center">
                <v-btn
                  class="mt-3"
                  icon
                  color="red"
                  @click="helpToggle = !helpToggle"
                >
                  <v-icon>{{ mdiCloseCircle }}</v-icon>
                </v-btn>
              </div>
              <div class="pa-3">
                <ul>
                  <li
                    v-for="(item, index) of help"
                    :key="index"
                    v-html="item"
                  />
                </ul>
              </div>
            </v-sheet>
          </v-bottom-sheet>
        </div>
      </div>
    </v-col>
  </v-row>
</template>

<script>
import { mdiHelpCircle, mdiCloseCircle } from '@mdi/js'

export default {
  props: {
    title: {
      type: String,
      default: '',
    },
    subtitle: {
      type: String,
      default: '',
    },
    help: {
      type: Array,
      default: [],
    },
  },
  data() {
    return {
      helpToggle: false,
      mdiHelpCircle,
      mdiCloseCircle,
    }
  },
}
</script>

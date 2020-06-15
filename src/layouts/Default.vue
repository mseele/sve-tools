<template>
  <v-app>
    <v-navigation-drawer v-if="sidebar" app permanent>
      <v-list rounded>
        <v-list-item>
          <v-list-item-content>
            <v-list-item-title class="title">
              {{ $static.metadata.siteName }}
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-divider></v-divider>
      </v-list>
      <v-list nav dense>
        <v-list-item-group v-model="item" color="primary">
          <v-list-item
            v-for="(action, index) in actions"
            :key="index"
            link
            :to="$static.metadata.pathPrefix + action.link"
          >
            <v-list-item-content>
              <v-list-item-title v-text="action.name"></v-list-item-title>
            </v-list-item-content>
          </v-list-item>
        </v-list-item-group>
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <slot />
    </v-main>
  </v-app>
</template>

<script>
import actions from '@/data/actions.json'

export default {
  props: {
    sidebar: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      item: 0,
      actions,
    }
  },
}
</script>

<static-query>
  query {
    metadata {
      pathPrefix
      siteName
    }
  }
</static-query>

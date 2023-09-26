<script setup lang="ts">
import Cookies from 'js-cookie'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

onMounted(() => {
  if (Cookies.get('sve_backend_tools') === 'verified') {
    redirect()
  }
})

const password = ref('')

function login() {
  if (window.btoa(password.value) === 'd29ya0BzdmU=') {
    Cookies.set('sve_backend_tools', 'verified', { expires: 28 })
    redirect()
  }
}

function redirect() {
  const router = useRouter()
  router.push({ name: 'default_action' })
}
</script>

<template>
  <v-layout full-height>
    <v-main style="min-height: 100vh">
      <v-container class="fill-height" fluid>
        <v-row align="center" justify="center">
          <v-col cols="12" sm="8" md="4">
            <v-text-field
              label="Passwort"
              name="password"
              type="password"
              variant="outlined"
              v-model="password"
              @keyup.enter="login"
            ></v-text-field>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-layout>
</template>

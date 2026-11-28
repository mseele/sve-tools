// PROTOTYPE (throwaway branch): Dev-Server-Konfiguration nur für den
// geteilten Demo-Link — erlaubt externe Tunnel-Hosts. Nicht mergen.
import { defineConfig } from 'vite'
import base from './vite.config'

export default defineConfig({
  ...base,
  server: {
    host: true,
    port: 5199,
    strictPort: true,
    allowedHosts: true
  }
})

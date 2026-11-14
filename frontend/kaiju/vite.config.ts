import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const authToken = loadEnv(mode, '.', '').AUTH_TOKEN

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        },
      },
    },
  }
})


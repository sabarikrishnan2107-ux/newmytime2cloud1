import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3010,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'https://backend.mytime2cloud.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    }
  }
})

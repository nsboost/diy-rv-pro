import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: '../firmware/esp32-s3/data',
    emptyOutDir: true
  },
  server: {
    host: '127.0.0.1',
    port: 5173
  }
})

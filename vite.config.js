import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solid()],
  server: {
    port: 8080
  },
  build: {
    target: 'esnext',
  },
  optimizeDeps: {
    include: ['d3']
  }
})
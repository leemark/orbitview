import { defineConfig } from 'vite'

export default defineConfig({
  base: '/orbitview/',
  test: {
    environment: 'jsdom',
    globals: true,
  },
})

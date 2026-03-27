import { defineConfig } from 'vite'

export default defineConfig({
  base: '/orbitview/',
  ssr: {
    noExternal: [],
  },
  build: {
    rollupOptions: {
      external: (id) => {
        // Skip bundling satellite.js pthreads build
        if (id.includes('pthreads')) return true
        return false
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})

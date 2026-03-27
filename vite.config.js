import { defineConfig } from 'vite'

export default defineConfig({
  base: '/orbitview/',
  server: {
    proxy: {
      '/celestrak': {
        target: 'https://celestrak.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/celestrak/, ''),
      },
    },
  },
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

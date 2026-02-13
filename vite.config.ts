import path from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

function manualChunks(id: string): string | undefined {
  if (id.includes('node_modules')) {
    if (id.includes('react-dom') || id.includes('scheduler')) {
      return 'vendor-react-dom'
    }
    if (id.includes('react') && !id.includes('react-dom')) {
      return 'vendor-react'
    }
    if (id.includes('@dnd-kit')) {
      return 'vendor-dnd'
    }
    if (id.includes('dexie')) {
      return 'vendor-db'
    }
    if (id.includes('lucide-react')) {
      return 'vendor-icons'
    }
    if (id.includes('zustand')) {
      return 'vendor-state'
    }
    if (
      id.includes('clsx') ||
      id.includes('tailwind-merge') ||
      id.includes('class-variance-authority')
    ) {
      return 'vendor-utils'
    }
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      manifest: false,
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
    target: 'es2022',
    minify: 'esbuild',
    cssMinify: true,
    sourcemap: false,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 500,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand', 'dexie'],
    force: false,
  },
})

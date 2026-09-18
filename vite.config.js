import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              test: /node_modules\/(react|react-dom|react-router-dom)/,
            },
            {
              name: 'firebase-vendor',
              test: /node_modules\/(firebase|@firebase)/,
            },
          ],
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
})
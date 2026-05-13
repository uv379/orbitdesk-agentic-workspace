import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'
import { mfConfig } from './module-federation.config'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: mfConfig.name,
      remotes: mfConfig.remotes,
      shared: mfConfig.shared,
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    modulePreload: false,
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
  },
})

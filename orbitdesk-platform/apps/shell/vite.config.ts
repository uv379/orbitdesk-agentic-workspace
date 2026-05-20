import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'
import { mfConfig } from './module-federation.config'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

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
    dedupe: ['react', 'react-dom', 'react-router-dom', 'zustand'],
    // Array form with regex = exact matching, no prefix bleed
    alias: [
      { find: '@', replacement: resolve(__dirname, 'src') },
      { find: '@orbitdesk/ui', replacement: resolve(__dirname, '../../packages/ui/src') },
      { find: '@orbitdesk/sdk', replacement: resolve(__dirname, '../../packages/sdk/src') },
      // Exact-match every zustand sub-path to its ESM build
      { find: /^zustand\/vanilla$/, replacement: resolve(__dirname, 'node_modules/zustand/esm/vanilla.mjs') },
      { find: /^zustand\/react$/, replacement: resolve(__dirname, 'node_modules/zustand/esm/react.mjs') },
      { find: /^zustand\/middleware$/, replacement: resolve(__dirname, 'node_modules/zustand/esm/middleware.mjs') },
      { find: /^zustand\/shallow$/, replacement: resolve(__dirname, 'node_modules/zustand/esm/shallow.mjs') },
      { find: /^zustand$/, replacement: resolve(__dirname, 'node_modules/zustand/esm/index.mjs') },
      { find: 'crypto-js', replacement: resolve(__dirname, 'node_modules/crypto-js/crypto-js.js') },
    ],
  },
  build: {
    modulePreload: false,
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
  },
})

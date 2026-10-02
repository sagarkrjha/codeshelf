import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { codeShelfStorageSyncPlugin } from './viteStorageSyncPlugin.ts';

export default defineConfig(() => {
  return {
    base: '/',

    plugins: [
      tailwindcss(),
      react(),
      codeShelfStorageSyncPlugin(),
    ],

    server: {
      port: 5173,
      strictPort: true,
    },

    preview: {
      port: 4173,
    },


    clearScreen: false,
  };
});
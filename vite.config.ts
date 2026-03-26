import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      // in production builds we want to strip out any leftover console/debugger
      // statements so there is no accidental logging or performance hit.
      build: {
        minify: 'esbuild',
        rollupOptions: {
          output: {
            manualChunks(id: string) {
              if (
                id.includes('node_modules/three/') ||
                id.includes('node_modules/@react-three/') ||
                id.includes('node_modules/three-stdlib/')
              ) {
                return 'three';
              }

              if (id.includes('node_modules/@google/genai/')) {
                return 'ai';
              }

              if (
                id.includes('node_modules/react/') ||
                id.includes('node_modules/react-dom/') ||
                id.includes('node_modules/scheduler/')
              ) {
                return 'react-vendor';
              }

              if (id.includes('node_modules/zustand/')) {
                return 'state-vendor';
              }

              return undefined;
            },
          },
        },
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

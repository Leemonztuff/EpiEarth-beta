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
            manualChunks: {
              'three': ['three', '@react-three/fiber', '@react-three/drei'],
              'vendor': ['react', 'react-dom', 'zustand'],
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

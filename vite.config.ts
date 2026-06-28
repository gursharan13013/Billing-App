import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: './',
      build: {
        target: 'es2015',
        outDir: 'dist'
      },
      server: {
        port: 3000,
        host: '0.0.0.0',
        watch: {
          ignored: ['**/android/**']
        }
      },
      optimizeDeps: {
        entries: ['index.html'],
        exclude: ['android']
      },
      plugins: [
        react(),
        legacy({
          targets: ['defaults', 'not IE 11', 'Chrome >= 69'],
        })
      ],
      define: {
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

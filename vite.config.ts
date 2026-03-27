import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'copy-routes-json',
        closeBundle() {
          const fs = require('fs');
          const sourcePath = '_routes.json';
          const destPath = 'dist/_routes.json';
          
          if (fs.existsSync(sourcePath)) {
            if (!fs.existsSync('dist')) {
              fs.mkdirSync('dist');
            }
            fs.copyFileSync(sourcePath, destPath);
            console.log('✅ Copied _routes.json to dist/');
          } else {
            console.warn('⚠️  _routes.json not found in project root');
          }
        }
      }
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    publicDir: 'public',
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
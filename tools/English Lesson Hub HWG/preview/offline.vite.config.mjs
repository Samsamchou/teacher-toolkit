import {defineConfig} from 'vite';import react from '@vitejs/plugin-react';
export default defineConfig({root:'offline-artifact',base:'./',publicDir:false,plugins:[react()],build:{outDir:'../offline-dist',emptyOutDir:true,sourcemap:false}});

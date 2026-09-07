import { defineConfig } from 'vite';
export default defineConfig({
  server: { host: '127.0.0.1', proxy: { '/api': 'http://127.0.0.1:8787' } },
  build: {
    rollupOptions: {
      output: { manualChunks: { blockly: ['blockly/core'], react: ['react', 'react-dom'] } },
    },
  },
});

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  root: 'src',         // Vite entry: src/index.html
  build: {
    outDir: '..',      // Output: vocabhero/index.html (das deploybare Bundle)
    emptyOutDir: false,
  },
})

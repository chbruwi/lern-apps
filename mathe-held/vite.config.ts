import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Bündelt die gesamte App in eine einzige index.html (kein CDN nötig, funktioniert offline)
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  root: 'src',          // Einstieg: src/index.html  (wie wort-abenteuer)
  build: {
    outDir: '..',       // Output: mathe-held/index.html
    emptyOutDir: false, // src/ nicht löschen
  },
})

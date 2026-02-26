import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Bündelt die gesamte App in eine einzige index.html (kein CDN nötig, funktioniert offline)
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: '.',        // Output direkt in den App-Ordner
    emptyOutDir: false, // Nur index.html überschreiben, src/ bleibt erhalten
  },
})

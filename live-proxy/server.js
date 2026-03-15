/**
 * VocabHero – Gemini Live API Proxy
 *
 * Nimmt WebSocket-Verbindungen vom Browser entgegen und leitet sie
 * bidirektional an die Gemini Live API weiter. Der API-Key bleibt
 * serverseitig und ist nie im Browser sichtbar.
 *
 * Umgebungsvariablen:
 *   GEMINI_API_KEY  – Google Gemini API Key (Pflicht)
 *   PORT            – Port (Standard: 3001)
 *   ALLOWED_ORIGINS – Kommagetrennte erlaubte Origins (optional)
 */

'use strict'

const http = require('http')
const { WebSocketServer, WebSocket } = require('ws')

// ---------------------------------------------------------------------------
// Konfiguration
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.PORT || '3001', 10)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY

const GEMINI_WS_URL =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent'

// Erlaubte Origins – leer = alle erlaubt (für Heimnetz OK)
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : []

// ---------------------------------------------------------------------------
// Startup-Check
// ---------------------------------------------------------------------------

if (!GEMINI_API_KEY) {
  console.error('[proxy] FEHLER: GEMINI_API_KEY ist nicht gesetzt.')
  process.exit(1)
}

// ---------------------------------------------------------------------------
// HTTP-Server (Health-Check + WebSocket-Upgrade)
// ---------------------------------------------------------------------------

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }))
    return
  }
  res.writeHead(404)
  res.end()
})

// ---------------------------------------------------------------------------
// WebSocket-Server
// ---------------------------------------------------------------------------

const wss = new WebSocketServer({ server })

wss.on('connection', (clientWs, req) => {
  const origin = req.headers.origin || '(kein Origin)'
  const ip = req.socket.remoteAddress

  // Origin-Check (nur wenn ALLOWED_ORIGINS konfiguriert)
  if (ALLOWED_ORIGINS.length > 0 && !ALLOWED_ORIGINS.includes(origin)) {
    console.warn(`[proxy] Verbindung abgelehnt – Origin nicht erlaubt: ${origin}`)
    clientWs.close(1008, 'Origin not allowed')
    return
  }

  console.log(`[proxy] Client verbunden | IP: ${ip} | Origin: ${origin}`)

  // Verbindung zur Gemini Live API aufbauen
  const geminiWs = new WebSocket(`${GEMINI_WS_URL}?key=${GEMINI_API_KEY}`, {
    headers: { 'User-Agent': 'VocabHero-Proxy/1.0' },
  })

  let geminiReady = false
  const pendingMessages = [] // Puffer für Nachrichten vor Gemini-Bereitschaft

  // --- Client → Gemini ---
  clientWs.on('message', (data, isBinary) => {
    if (geminiReady) {
      geminiWs.send(data, { binary: isBinary })
    } else {
      pendingMessages.push({ data, isBinary })
    }
  })

  // --- Gemini bereit → gepufferte Nachrichten senden ---
  geminiWs.on('open', () => {
    geminiReady = true
    console.log(`[proxy] Gemini-Verbindung aufgebaut (${pendingMessages.length} gepufferte Nachrichten)`)
    for (const msg of pendingMessages) {
      geminiWs.send(msg.data, { binary: msg.isBinary })
    }
    pendingMessages.length = 0
  })

  // --- Gemini → Client ---
  geminiWs.on('message', (data, isBinary) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(data, { binary: isBinary })
    }
  })

  // --- Verbindungsabbau ---
  clientWs.on('close', (code, reason) => {
    console.log(`[proxy] Client getrennt | Code: ${code}`)
    if (geminiWs.readyState === WebSocket.OPEN || geminiWs.readyState === WebSocket.CONNECTING) {
      geminiWs.close()
    }
  })

  geminiWs.on('close', (code, reason) => {
    console.log(`[proxy] Gemini getrennt | Code: ${code}`)
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close(1001, 'Upstream closed')
    }
  })

  // --- Fehlerbehandlung ---
  clientWs.on('error', err => {
    console.error(`[proxy] Client-Fehler: ${err.message}`)
    geminiWs.close()
  })

  geminiWs.on('error', err => {
    console.error(`[proxy] Gemini-Fehler: ${err.message}`)
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close(1011, 'Upstream error')
    }
  })
})

// ---------------------------------------------------------------------------
// Server starten
// ---------------------------------------------------------------------------

server.listen(PORT, () => {
  console.log(`[proxy] Läuft auf Port ${PORT}`)
  console.log(`[proxy] Health-Check: http://localhost:${PORT}/health`)
  if (ALLOWED_ORIGINS.length > 0) {
    console.log(`[proxy] Erlaubte Origins: ${ALLOWED_ORIGINS.join(', ')}`)
  } else {
    console.log(`[proxy] Origins: alle erlaubt`)
  }
})

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('[proxy] SIGTERM empfangen – beende Verbindungen...')
  wss.close(() => server.close(() => process.exit(0)))
})

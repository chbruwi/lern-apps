FROM node:20-alpine

WORKDIR /app

# Abhängigkeiten zuerst (Layer-Caching)
COPY package*.json ./
RUN npm ci --only=production

# App-Code
COPY server.js .

EXPOSE 3001

# Health-Check (Docker prüft alle 30s)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

USER node

CMD ["node", "server.js"]

FROM node:20-alpine AS client-build

WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ── Server stage ──────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

COPY server/package*.json ./server/
# Install production deps then add prisma CLI (needed for db push at startup).
RUN cd server && npm ci --omit=dev && npm install --no-save prisma

COPY server/ ./server/
COPY --from=client-build /app/client/build ./client/build

# Persistent data directory; Docker will mount a named volume here.
RUN mkdir -p /app/data

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3000

ENV NODE_ENV=production

ENTRYPOINT ["/docker-entrypoint.sh"]

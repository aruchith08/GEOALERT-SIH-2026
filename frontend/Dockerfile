# SIH 2026 Landslide Intelligence Platform — Next.js Frontend Service
# Multi-stage production build

# Stage 1: Dependency installation & Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY frontend/package.json ./

RUN npm install

COPY frontend/ ./

ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

RUN npm run build

# Stage 2: Production runtime runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

COPY --from=builder /app/package.json ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "run", "start"]

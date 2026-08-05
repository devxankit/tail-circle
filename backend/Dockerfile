# ─── TailCircle API — production image ──────────────────────────────────────
# Multi-stage: install prod deps in one layer, run as a non-root user.

FROM node:20-alpine AS deps
WORKDIR /app
# Only copy manifests first so `npm ci` is cached until deps actually change.
COPY package.json package-lock.json* ./
# Fall back to `npm install` when no lockfile is present.
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=5000

# dumb-init gives us correct signal forwarding (SIGTERM → graceful shutdown).
RUN apk add --no-cache dumb-init

# Copy prod node_modules from the deps stage, then the source.
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Run as the built-in unprivileged `node` user.
RUN chown -R node:node /app
USER node

EXPOSE 5000

# Container-level liveness check (compose/orchestrators read this).
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]

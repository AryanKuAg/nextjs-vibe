# ─── Stage 1: deps ───────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat

WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts skips the postinstall `prisma generate` which needs schema.prisma
# prisma generate is run explicitly in the builder stage where all files exist
RUN npm ci --ignore-scripts

# ─── Stage 2: builder ─────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# ── NEXT_PUBLIC_* vars baked into the client bundle at build time ────────────
# These are all PUBLIC keys (safe to be in the image — they're exposed to browsers anyway)
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_Y2xlcmsuZnJhbWVyYXRlLnNwYWNlJA
ENV NEXT_PUBLIC_APP_URL=https://framerate.space
ENV NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
ENV NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
ENV NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
ENV NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
ENV NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=google-site-verification=-DSKbd6GxEzoqusHYaT6I9PxEUinkIpaTyQbKJikJkQ
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=178411879617-d0fhq6cokkk01ogupjuf40o6ld83hhfr.apps.googleusercontent.com

# Build Next.js standalone output
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ─── Stage 3: runner ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

# ffmpeg is required for the /api/extract-frames route
RUN apk add --no-cache ffmpeg

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Cloud Run injects PORT automatically; Next.js reads it
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Standalone output — only copy what's needed to run
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma client so migrations/queries work at runtime
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# ffmpeg-static binary (used by fluent-ffmpeg in extract-frames)
COPY --from=builder /app/node_modules/ffmpeg-static ./node_modules/ffmpeg-static
# ffprobe-static binary
COPY --from=builder /app/node_modules/ffprobe-static ./node_modules/ffprobe-static

USER nextjs

EXPOSE 8080

CMD ["node", "server.js"]

# Base node image (matches .nvmrc = 24; required for process.getBuiltinModule)
FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM deps AS builder
WORKDIR /app
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# NEXT_PUBLIC_* are inlined into the client bundle at build time, so they must
# be present here. They are passed in by mac-exe-docker-build-pull.sh from .env
# and .env.docker (.env.docker overrides .env).
# Server-only secrets (JWT_SECRET, SUPABASE_SERVICE_ROLE_KEY, FASHN_API_KEY,
# CLAUDE_API_KEY, GEMINI_API_KEY, ...) are NOT baked in - compose injects them
# at runtime via env_file.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SUPABASE_RESULTS_BUCKET
ARG NEXT_PUBLIC_NAVER_LOGIN_CLIENT_ID
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_KAKAO_KEY
ARG NEXT_PUBLIC_VTRON_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_RESULTS_BUCKET=$NEXT_PUBLIC_SUPABASE_RESULTS_BUCKET
ENV NEXT_PUBLIC_NAVER_LOGIN_CLIENT_ID=$NEXT_PUBLIC_NAVER_LOGIN_CLIENT_ID
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_KAKAO_KEY=$NEXT_PUBLIC_KAKAO_KEY
ENV NEXT_PUBLIC_VTRON_URL=$NEXT_PUBLIC_VTRON_URL

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Static public assets
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache and local style-ex crop output
RUN mkdir -p .next .style-ex-crops && chown -R nextjs:nodejs .next .style-ex-crops

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Runtime filesystem assets read via process.cwd() / dynamic createRequire()
# (brands-server.ts reads res/brand-product-apis.json; style-ex & full-style-ex
# load SHA-256-sealed CommonJS engines and prompt files outside static NFT tracing)
COPY --from=builder --chown=nextjs:nodejs /app/res ./res
COPY --from=builder --chown=nextjs:nodejs /app/lib/style-ex ./lib/style-ex
COPY --from=builder --chown=nextjs:nodejs /app/lib/full-style-ex ./lib/full-style-ex

USER nextjs

EXPOSE 8920

ENV PORT=8920
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

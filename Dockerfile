# 1. Install dependencies only when needed
FROM node:20-alpine AS deps
# We use alpine as it's a small, secure base image.
# libc6-compat is needed for some Next.js features on Alpine Linux.
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# 2. Rebuild the source code only when needed
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the Next.js application for production.
RUN npm run build

# 3. Production image, copy only the necessary files to run the app
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# The standalone output mode in Next.js creates a folder at .next/standalone 
# which copies only the necessary files for a production deployment.
# This makes the final Docker image much smaller.
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Create a non-root user for security best practices
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

EXPOSE 3000

ENV PORT 3000

# Run the application
CMD ["node", "server.js"]

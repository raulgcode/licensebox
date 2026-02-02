# syntax = docker/dockerfile:1

ARG NODE_VERSION=22.21.1
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="NestJS API"

WORKDIR /app

ENV NODE_ENV="production"
ENV CI=true

# Install pnpm
ARG PNPM_VERSION=10.28.2
RUN npm install -g pnpm@$PNPM_VERSION

# Build stage
FROM base AS build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3 openssl

# Copy workspace configuration files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./

# Copy package.json files for all workspaces
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/database ./packages/database
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Generate Prisma client
RUN pnpm --filter database db:generate:prod

# Build shared package first, then API
RUN pnpm --filter shared build
RUN pnpm --filter api build

# Production stage - copy entire workspace to preserve pnpm structure
FROM base AS production

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y openssl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy entire built workspace (preserves pnpm symlinks and structure)
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/packages ./packages
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /app/pnpm-lock.yaml ./pnpm-lock.yaml

# Install prisma CLI and tsx globally for migrations and seeding
RUN npm install -g prisma@6.19.2 tsx

# Create migration script (runs migrations + production seed)
RUN printf '#!/bin/sh\nset -e\ncd /app\necho "Running migrations..."\nprisma migrate deploy --schema=packages/database/prisma/schema.prisma\necho "Running production seed (users only)..."\ntsx packages/database/prisma/seed-prod.ts\necho "Done!"\n' > /app/migrate.sh && chmod +x /app/migrate.sh

WORKDIR /app/apps/api

EXPOSE 3000

CMD ["node", "dist/main.js"]

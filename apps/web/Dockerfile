# syntax = docker/dockerfile:1

ARG NODE_VERSION=22.21.1
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="React Router"

WORKDIR /app

ENV NODE_ENV="production"

# Install pnpm
ARG PNPM_VERSION=10.28.2
RUN npm install -g pnpm@$PNPM_VERSION

# Build stage
FROM base AS build

# Build-time arguments for Vite
ARG VITE_API_URL=https://licensebox-api.fly.dev
ENV VITE_API_URL=$VITE_API_URL

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

# Copy workspace configuration files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy package.json files for all workspaces
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

# Build shared package first, then web
RUN pnpm --filter shared build
RUN pnpm --filter web build

# Production stage
FROM base AS production

WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy package.json files
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts
COPY --from=build /app/apps/web/build ./apps/web/build
COPY --from=build /app/packages/shared ./packages/shared

WORKDIR /app/apps/web

EXPOSE 3000

CMD ["pnpm", "start"]

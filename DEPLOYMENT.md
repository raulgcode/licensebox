# Deployment Guide

## Environment Variables

This application supports two modes for environment configuration:

### Development (Local)

Uses the `.env` file at the project root:

```bash
cp .env.example .env
# Edit .env with your values
pnpm run dev
```

### Production (Server)

Uses **system environment variables**. No `.env` file is needed.

## Required Environment Variables

Set these in your production environment (Docker, Kubernetes, cloud provider, etc.):

```bash
# Database
DATABASE_URL="postgresql://user:password@host:port/database"

# API
PORT=3000
NODE_ENV=production

# JWT Authentication
JWT_SECRET="your-production-secret-min-32-chars"
JWT_EXPIRES_IN="7d"

# Admin User (for initial seed)
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="secure-production-password"
```

## Deployment Steps

### 1. Build the Application

```bash
# Install dependencies
pnpm install --prod

# Build all packages
pnpm run build
```

### 2. Database Setup

#### Generate Prisma Client (uses system env vars)

```bash
pnpm --filter @licensebox/database db:generate:prod
```

#### Run Migrations

```bash
pnpm --filter @licensebox/database db:migrate:deploy
```

#### Seed Database (optional, first time only)

```bash
pnpm --filter @licensebox/database db:seed:prod
```

### 3. Start the Application

```bash
# Start API
cd apps/api
node dist/main.js
```

## Docker Deployment

Example `Dockerfile`:

```dockerfile
FROM node:18-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS dependencies
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile --prod

FROM base AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

FROM base AS production
WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/packages/database/prisma ./packages/database/prisma
COPY --from=build /app/packages/database/dist ./packages/database/dist
COPY --from=build /app/package.json ./

# Environment variables will be provided at runtime
ENV NODE_ENV=production

# Generate Prisma Client
RUN cd packages/database && npx prisma generate

EXPOSE 3000

CMD ["node", "apps/api/dist/main.js"]
```

Example `docker-compose.yml` for production:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: licensebox
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: licensebox_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  api:
    build: .
    ports:
      - '3000:3000'
    environment:
      DATABASE_URL: postgresql://licensebox:${DB_PASSWORD}@postgres:5432/licensebox_db
      PORT: 3000
      NODE_ENV: production
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRES_IN: 7d
      ADMIN_EMAIL: ${ADMIN_EMAIL}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
    depends_on:
      - postgres
    restart: unless-stopped

volumes:
  postgres_data:
```

## Cloud Platform Examples

### Heroku

Set environment variables in Heroku:

```bash
heroku config:set DATABASE_URL="postgresql://..."
heroku config:set JWT_SECRET="your-secret"
heroku config:set NODE_ENV="production"
heroku config:set ADMIN_EMAIL="admin@example.com"
heroku config:set ADMIN_PASSWORD="secure-password"
```

### AWS ECS / EC2

Set environment variables in task definition or use AWS Systems Manager Parameter Store.

### Kubernetes

Create a Secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: licensebox-secrets
type: Opaque
stringData:
  DATABASE_URL: 'postgresql://...'
  JWT_SECRET: 'your-secret'
  ADMIN_PASSWORD: 'secure-password'
```

Reference in Deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: licensebox-api
spec:
  template:
    spec:
      containers:
        - name: api
          image: licensebox-api:latest
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: licensebox-secrets
                  key: DATABASE_URL
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: licensebox-secrets
                  key: JWT_SECRET
            - name: NODE_ENV
              value: 'production'
            - name: PORT
              value: '3000'
            - name: ADMIN_EMAIL
              value: 'admin@example.com'
            - name: ADMIN_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: licensebox-secrets
                  key: ADMIN_PASSWORD
```

### Vercel / Netlify

Set environment variables in the project settings dashboard.

## Database Scripts in Production

### Development Scripts (use .env file)

- `pnpm --filter database db:migrate` - Development migrations
- `pnpm --filter database db:generate` - Generate client (dev)
- `pnpm --filter database db:seed` - Seed database (dev)

### Production Scripts (use system env vars)

- `pnpm --filter database db:migrate:deploy` - Production migrations
- `pnpm --filter database db:generate:prod` - Generate client (prod)
- `pnpm --filter database db:seed:prod` - Seed database (prod)

## Security Best Practices

1. **Never commit `.env` files** - Already in `.gitignore`
2. **Use strong JWT secrets** - Minimum 32 characters, randomly generated
3. **Rotate secrets regularly** - Especially JWT_SECRET and database passwords
4. **Use different credentials per environment** - Dev, staging, production should have different secrets
5. **Enable HTTPS** - Use reverse proxy like Nginx or cloud load balancer
6. **Database security** - Use SSL/TLS for database connections in production
7. **CORS configuration** - Configure allowed origins in production

## Monitoring

Consider adding:

- Application monitoring (PM2, New Relic, DataDog)
- Database monitoring
- Error tracking (Sentry)
- Logging aggregation (ELK, CloudWatch)

## Health Checks

The API provides a health check endpoint:

```bash
GET /
# Returns: "Hello World!"
```

Use this for container health checks and load balancer health probes.

## Troubleshooting

### "Environment variable not found: DATABASE_URL"

**In Development:**

- Ensure `.env` file exists at project root
- Verify DATABASE_URL is set in `.env`

**In Production:**

- Ensure DATABASE_URL is set as system environment variable
- Check container/pod environment configuration

### "JWT secret is not defined"

**In Production:**

- Ensure JWT_SECRET is set as system environment variable
- Must be set before starting the application

### Prisma Client Not Generated

**In Production:**
Run the generation command:

```bash
pnpm --filter database db:generate:prod
```

Or include in your build/deployment process.

---

**Note:** The application automatically detects whether to use `.env` file (development) or system environment variables (production) based on:

1. File existence: If `.env` exists, it's loaded
2. NODE_ENV: If set to "production", `.env` file is ignored
3. System variables always take precedence when both exist

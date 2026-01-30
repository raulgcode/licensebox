# LicenseBox Architecture

## Monorepo Structure

LicenseBox uses a **Turborepo monorepo** structure with pnpm workspaces:

```
licensebox/
├── .env                        # Centralized environment variables
├── apps/
│   ├── api/                    # NestJS Backend (Port 3000)
│   └── web/                    # React Frontend (Port 5173)
└── packages/
    ├── database/               # Prisma ORM & Database Client
    └── shared/                 # Shared types & utilities
```

## Package Dependencies

```
┌─────────────┐
│  apps/api   │──┐
└─────────────┘  │
                 ├──→ ┌──────────────────┐
┌─────────────┐  │    │ packages/database│
│  apps/web   │──┘    └──────────────────┘
└─────────────┘
       │
       ↓
┌──────────────────┐
│ packages/shared  │
└──────────────────┘
```

### Dependency Rules

- **apps/api** depends on `@licensebox/database` and `@licensebox/shared`
- **apps/web** depends on `@licensebox/shared` (for types/DTOs)
- **packages/database** is independent (only Prisma dependencies)
- **packages/shared** is independent (only type definitions)

## Environment Variables Strategy

### Centralized Configuration

All environment variables are stored in **one `.env` file at the project root**. This design:

✅ **Eliminates circular dependencies** - No package loads .env from another package
✅ **Single source of truth** - All apps/packages reference the same configuration
✅ **Simplifies deployment** - One .env file to manage
✅ **Clear ownership** - Root-level configuration is repository-level concern

### How It Works

**NestJS API (`apps/api`):**

```typescript
// apps/api/src/app.module.ts
ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: join(__dirname, '../../../.env'), // Points to root .env
});
```

**Database Package (`packages/database`):**

```json
// packages/database/package.json
{
  "scripts": {
    "db:migrate": "dotenv -e ../../.env -- prisma migrate dev",
    "db:generate": "dotenv -e ../../.env -- prisma generate"
  }
}
```

**Seed Script (`packages/database/prisma/seed.ts`):**

```typescript
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
```

### Required Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/database"

# API Configuration
PORT=3000
NODE_ENV=development

# JWT Authentication
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"

# Admin User (for seeding)
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="secure-password"
```

## Authentication Architecture

### Flow

```
┌──────────┐     POST /auth/login      ┌─────────────┐
│  Client  │──────────────────────────→│  API        │
│          │                            │             │
│          │←──────────────────────────│  - Validate │
│          │     JWT Token              │  - Hash pwd │
└──────────┘                            │  - Gen JWT  │
     │                                  └─────────────┘
     │  Authenticated Request                 │
     │  Authorization: Bearer <token>         │
     ↓                                        ↓
┌──────────┐                          ┌─────────────┐
│Protected │───────JWT Guard─────────→│  Database   │
│Endpoint  │                           └─────────────┘
└──────────┘
```

### Components

**Global JWT Guard (`apps/api/src/auth/auth.guard.ts`):**

- Applied to all routes by default
- Validates JWT token on each request
- Extracts user payload and attaches to `request.user`

**@Public() Decorator:**

- Marks endpoints that don't require authentication
- Used on `/auth/login` endpoint

**Password Security:**

- bcrypt with 10 salt rounds
- Passwords never stored in plain text
- Hashing performed in `auth.service.ts`

**Admin User:**

- Created via database seed script
- Credentials from environment variables
- Can be customized per environment

## Shared Types

### Why @licensebox/shared?

DTOs and types need to be shared between:

- **Backend** (NestJS validation/serialization)
- **Frontend** (TypeScript type safety, API calls)

**Location:** `packages/shared/src/types/`

**Example:**

```typescript
// packages/shared/src/types/auth.types.ts
export class LoginDto {
  email: string;
  password: string;
}

// Used in apps/api
import { LoginDto } from '@licensebox/shared';

// Used in apps/web
import type { LoginDto } from '@licensebox/shared';
```

### Import Strategy

- **Backend:** Import as **classes** (for decorators)
- **Frontend:** Import as **types** (type-only imports)

## Database Management

### Prisma Workflow

```
1. Edit Schema
   ↓
   packages/database/prisma/schema.prisma

2. Generate Migration
   ↓
   pnpm --filter database db:migrate

3. Generate Client
   ↓
   Happens automatically after migrate

4. Use in Code
   ↓
   import { PrismaService } from '@licensebox/database';
```

### Package Exports

```typescript
// packages/database/src/index.ts
export { PrismaClient } from '@prisma/client';
export * from './prisma.service';
```

All apps import from `@licensebox/database`, never directly from `@prisma/client`.

## Development Commands

### Root-Level Commands

```bash
pnpm run dev          # Start all services (API + Web)
pnpm run build        # Build all packages
pnpm run lint         # Lint all packages
pnpm run test         # Test all packages
```

### Filtered Commands

```bash
# API
pnpm --filter api dev
pnpm --filter api build
pnpm --filter api test

# Database
pnpm --filter database db:migrate
pnpm --filter database db:generate
pnpm --filter database db:studio
pnpm --filter database db:seed

# Web
pnpm --filter web dev
pnpm --filter web build
```

## Deployment Considerations

### Environment Variables

1. Copy `.env.example` to `.env` in production environment
2. Update all secrets (JWT_SECRET, DATABASE_URL, ADMIN_PASSWORD)
3. Set NODE_ENV=production
4. Ensure `.env` is in `.gitignore` (already configured)

### Build Order

Turborepo automatically handles build dependencies:

1. `packages/shared` (no dependencies)
2. `packages/database` (generates Prisma Client)
3. `apps/api` (depends on shared + database)
4. `apps/web` (depends on shared)

### Docker Considerations

When containerizing:

- Mount root `.env` or use Docker secrets
- Database package will need access to `.env` for migrations
- Consider multi-stage builds for smaller images

## Key Design Decisions

### ✅ Why JWT?

- Stateless authentication
- Scales horizontally
- Works across services
- Standard industry practice

### ✅ Why Monorepo?

- Share code between frontend/backend
- Consistent TypeScript types
- Atomic commits across packages
- Simplified dependency management

### ✅ Why Root .env?

- No circular dependencies
- Single configuration point
- Easier to manage
- Clear separation of concerns

### ✅ Why Global Auth Guard?

- Security by default
- Opt-out with @Public() decorator
- Prevents accidentally exposing endpoints
- Industry best practice

## Troubleshooting

### "Environment variable not found"

**Problem:** Prisma can't find DATABASE_URL

**Solution:** Ensure `.env` exists at project root (copy from `.env.example`)

### "Circular dependency detected"

**Problem:** Old architecture had apps/api/.env being loaded by database package

**Solution:** Now fixed - all packages load from root `.env`

### "JWT secret not defined"

**Problem:** ConfigService can't find JWT_SECRET

**Solution:** Check root `.env` has JWT_SECRET defined and API's ConfigModule points to root

## Future Considerations

### Potential Improvements

- [ ] Add refresh token mechanism
- [ ] Implement role-based access control (RBAC)
- [ ] Add API rate limiting
- [ ] Implement audit logging
- [ ] Add email verification for admin users
- [ ] Consider splitting .env for development/production
- [ ] Add health check endpoints
- [ ] Implement graceful shutdown

### Scaling Considerations

- Add Redis for session storage if needed
- Consider API Gateway for multiple services
- Implement database read replicas
- Add caching layer (Redis/Memcached)
- Implement job queues for background tasks

---

**Last Updated:** 2025-01-29  
**Architecture Version:** 1.0

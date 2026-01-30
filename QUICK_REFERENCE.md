# Quick Reference Guide

## 🚀 Getting Started

```bash
# Clone and setup
git clone <repo-url>
cd licensebox
cp .env.example .env    # Edit with your credentials
pnpm run setup          # One-time setup
pnpm run dev            # Start development
```

## 📁 Project Structure

```
licensebox/
├── .env                  # ⚠️ Your environment variables (DO NOT COMMIT)
├── apps/
│   ├── api/              # NestJS Backend (localhost:3000)
│   └── web/              # React Frontend (localhost:5173)
└── packages/
    ├── database/         # Prisma ORM
    └── shared/           # Shared TypeScript types
```

## 🔑 Environment Variables

**Location:** `.env` at project root (not in apps/api or apps/web)

**Required:**

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/db"
JWT_SECRET="your-secret-key-min-32-chars"
JWT_EXPIRES_IN="7d"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="secure-password"
PORT=3000
NODE_ENV=development
```

## 💻 Common Commands

### Development

```bash
pnpm run dev              # Start everything
pnpm --filter api dev     # API only
pnpm --filter web dev     # Web only
```

### Database

```bash
pnpm --filter database db:migrate        # Create/run migrations
pnpm --filter database db:migrate:status # Check migration status
pnpm --filter database db:generate       # Generate Prisma Client
pnpm --filter database db:studio         # Open database GUI
pnpm --filter database db:seed           # Seed with admin user
```

**Migration tracking:** See [DATABASE_MIGRATIONS.md](DATABASE_MIGRATIONS.md) for complete guide on:
- Creating and tracking migrations
- Migration history and status
- Production deployment
- Troubleshooting

### Build & Quality

```bash
pnpm run build           # Build all packages
pnpm run lint            # Lint everything
pnpm run test            # Run tests
```

## 🔐 Authentication

### Login Endpoint

```bash
POST http://localhost:3000/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "your-admin-password"
}

# Returns:
{
  "access_token": "eyJhbGc...",
  "user": {
    "id": 1,
    "email": "admin@example.com",
    "name": "Admin"
  }
}
```

### Authenticated Requests

```bash
GET http://localhost:3000/auth/profile
Authorization: Bearer eyJhbGc...
```

### Public Endpoints

Only `/auth/login` is public. All other endpoints require authentication.

## 🗄️ Database Schema

### User Model

```prisma
model User {
  id        Int       @id @default(autoincrement())
  email     String    @unique
  password  String    // bcrypt hashed
  name      String?
  isActive  Boolean   @default(true)
  licenses  License[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}
```

### Modifying Schema

1. Edit `packages/database/prisma/schema.prisma`
2. Run `pnpm --filter database db:migrate --name description`
3. Prisma Client auto-regenerates

## 📦 Adding Dependencies

### Root dependencies

```bash
pnpm add <package> -w
```

### App-specific

```bash
pnpm add <package> --filter api
pnpm add <package> --filter web
```

### Dev dependencies

```bash
pnpm add -D <package> --filter api
```

## 🎯 Common Tasks

### Create a new API endpoint

1. Create controller:

```typescript
// apps/api/src/features/feature.controller.ts
import { Controller, Get } from '@nestjs/common';

@Controller('feature')
export class FeatureController {
  @Get()
  findAll() {
    return { message: 'Feature list' };
  }
}
```

2. Add to module:

```typescript
// apps/api/src/app.module.ts
import { FeatureController } from './features/feature.controller';

@Module({
  controllers: [FeatureController],
})
```

3. Test: `curl http://localhost:3000/feature`

### Add shared types

1. Create in shared package:

```typescript
// packages/shared/src/types/feature.types.ts
export interface Feature {
  id: number;
  name: string;
}
```

2. Export from index:

```typescript
// packages/shared/src/types/index.ts
export * from './feature.types';
```

3. Use in API or Web:

```typescript
import { Feature } from '@licensebox/shared';
```

### Add database model

1. Edit schema:

```prisma
// packages/database/prisma/schema.prisma
model Feature {
  id   Int    @id @default(autoincrement())
  name String
}
```

2. Create migration:

```bash
pnpm --filter database db:migrate --name add_feature
```

3. Use in code:

```typescript
import { PrismaService } from '@licensebox/database';

// In service:
await this.prisma.feature.findMany();
```

## 🐛 Troubleshooting

### Environment variable not found

**Problem:** `Environment variable not found: DATABASE_URL`  
**Fix:** Ensure `.env` exists at **project root** (not in apps/api)

### Port already in use

**Problem:** `Port 3000 is already in use`  
**Fix:** Change PORT in `.env` or kill process: `npx kill-port 3000`

### Database connection failed

**Problem:** Can't connect to PostgreSQL  
**Fix:**

```bash
docker ps                    # Check if postgres is running
docker-compose restart       # Restart database
docker-compose logs postgres # Check logs
```

### Prisma Client not generated

**Problem:** `Cannot find module '@prisma/client'`  
**Fix:** `pnpm --filter database db:generate`

### Circular dependency error

**Problem:** Build fails with circular dependency  
**Fix:** This should be fixed now. All packages use root `.env`

### JWT secret not defined

**Problem:** `JWT secret is not defined`  
**Fix:** Add `JWT_SECRET` to root `.env` file

## 📚 Documentation

- [README.md](README.md) - Project overview
- [SETUP.md](SETUP.md) - Detailed setup instructions
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
- [AUTHENTICATION.md](AUTHENTICATION.md) - Auth system details
- [ADMIN_SETUP.md](ADMIN_SETUP.md) - Admin user setup

## 🔗 Useful Links

- **API Docs:** http://localhost:3000
- **Web App:** http://localhost:5173
- **Database GUI:** `pnpm run db:studio` → http://localhost:5555
- **NestJS Docs:** https://docs.nestjs.com
- **Prisma Docs:** https://www.prisma.io/docs
- **React Router:** https://reactrouter.com

## 🎨 Code Style

- Use TypeScript strict mode
- Follow ESLint rules
- Prefer async/await over promises
- Use meaningful variable names
- Add JSDoc comments for public APIs
- Keep functions small and focused

## ✅ Pre-Commit Checklist

- [ ] `.env` not committed
- [ ] `pnpm run lint` passes
- [ ] `pnpm run build` succeeds
- [ ] All tests pass
- [ ] No console.log() left in code
- [ ] Database migrations created if schema changed

---

**Need help?** Check [ARCHITECTURE.md](ARCHITECTURE.md) for detailed information.

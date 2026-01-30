# @licensebox/database

Shared database package with Prisma ORM for LicenseBox.

## What's included

- **Prisma Client** - Generated database client
- **Prisma Schema** - Database schema definitions
- **PrismaService** - NestJS-compatible service
- **Type Exports** - All generated Prisma types

## Usage

### In NestJS (API)

```typescript
import { PrismaService } from '@licensebox/database';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getUsers() {
    return this.prisma.user.findMany();
  }
}
```

### In Shared Package

```typescript
import type { User, License } from '@licensebox/database';

export interface UserDTO {
  user: User;
  licenses: License[];
}
```

## Commands

**Important:** All database commands automatically load environment variables from `apps/api/.env`. Make sure you have created this file with your `DATABASE_URL` before running these commands.

```bash
# Generate Prisma Client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Open Prisma Studio
pnpm db:studio

# Push schema changes (without migrations)
pnpm db:push

# Seed the database
pnpm db:seed
```

### Environment Variables

The following environment variables are required (loaded from `.env` at project root):

- `DATABASE_URL` - PostgreSQL connection string
- `ADMIN_EMAIL` - Admin user email (for seeding)
- `ADMIN_PASSWORD` - Admin user password (for seeding)

Example `.env` at project root:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
ADMIN_EMAIL="admin@licensebox.com"
ADMIN_PASSWORD="your-secure-password"
```

## Troubleshooting

### "Environment variable not found: DATABASE_URL"

**Problem:** Prisma can't find the DATABASE_URL environment variable.

**Solution:** Make sure you have created the `.env` file at the **project root** with the DATABASE_URL variable set. All database commands now use `dotenv-cli` to automatically load environment variables from `.env` at the project root.

### Seed Script Fails with "ADMIN_PASSWORD environment variable is required"

**Problem:** The seed script can't find the ADMIN_PASSWORD.

**Solution:** Add `ADMIN_PASSWORD` to your `.env` file at the project root:

```env
ADMIN_PASSWORD="your-secure-password"
```

## Schema Location

`prisma/schema.prisma`

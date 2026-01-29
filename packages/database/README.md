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
import { PrismaService } from "@licensebox/database";

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
import type { User, License } from "@licensebox/database";

export interface UserDTO {
  user: User;
  licenses: License[];
}
```

## Commands

```bash
# Generate Prisma Client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Open Prisma Studio
pnpm db:studio

# Push schema changes (dev only)
pnpm db:push
```

## Schema Location

`prisma/schema.prisma`

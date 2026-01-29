# Shared Package

This package contains shared code used across the LicenseBox monorepo.

## Contents

- **Types**: Shared TypeScript types and interfaces
- **Validations**: Zod schemas for validation (usable on both backend and frontend)
- **Prisma** (future): Database schema and generated Prisma client

## Usage

### In API (Backend)

```typescript
import { User, License } from "@licensebox/shared/types";
import { createUserSchema } from "@licensebox/shared/validations";
```

### In Web (Frontend)

```typescript
import type { User, ApiResponse } from "@licensebox/shared/types";
import { createUserSchema } from "@licensebox/shared/validations";
```

## Adding Prisma (Future)

When you're ready to add Prisma:

1. Install Prisma in this package:

   ```bash
   cd packages/shared
   pnpm add prisma @prisma/client
   ```

2. Initialize Prisma:

   ```bash
   pnpm dlx prisma init
   ```

3. Update `package.json` exports to include Prisma client
4. Generate Prisma client after schema changes:
   ```bash
   pnpm dlx prisma generate
   ```

# Authentication Setup Instructions

## Quick Start

### 1. Setup Environment Variables

Copy the example env file and configure it at the **project root**:

```bash
cp .env.example .env
```

Edit `.env` and set your values:

```env
DATABASE_URL="postgresql://licensebox:licensebox_dev@localhost:5432/licensebox_db"
PORT=3000
NODE_ENV=development

# IMPORTANT: Change these in production!
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

# Admin User Configuration
ADMIN_EMAIL="admin@licensebox.com"
ADMIN_PASSWORD="change-this-secure-admin-password"
```

**⚠️ IMPORTANT:** Set a strong `ADMIN_PASSWORD` before running the seed script!

### 2. Install Dependencies

```bash
# From project root
pnpm install
```

### 3. Setup Database

Make sure PostgreSQL is running (via Docker or locally), then run:

**Note:** Database scripts automatically load environment variables from `.env` at project root

```bash
cd packages/database

# Generate Prisma Client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Seed database with initial users
pnpm db:seed
```

### 4. Start the API

```bash
cd apps/api
pnpm dev
```

The API will be available at `http://localhost:3000`

## Testing Authentication

### 1. Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@licensebox.com","password":"your-admin-password"}'
```

**Note:** Use the password you set in `ADMIN_PASSWORD` environment variable.

Response:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "admin@licensebox.com",
    "name": "Admin User",
    "isActive": true
  }
}
```

### 2. Access Protected Route

```bash
# Replace TOKEN with the access_token from login
curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer TOKEN"
```

### 3. Test Unauthorized Access

```bash
# Without token - should return 401
curl http://localhost:3000/auth/me
```

## Default Users

After seeding, the admin user will be created with credentials from your `.env` file:

| Email                                 | Password                                 | Name       |
| ------------------------------------- | ---------------------------------------- | ---------- |
| Value from `ADMIN_EMAIL` env variable | Value from `ADMIN_PASSWORD` env variable | Admin User |
| john@example.com (sample)             | password123                              | John Doe   |
| jane@example.com (sample)             | password123                              | Jane Smith |

⚠️ **Change the admin password in production! Set a strong `ADMIN_PASSWORD` in your `.env` file.**

## Project Structure

```
apps/api/src/
├── auth/
│   ├── auth.module.ts          # Auth module configuration
│   ├── auth.service.ts         # Authentication logic
│   ├── auth.controller.ts      # Auth endpoints
│   ├── auth.guard.ts           # Global JWT guard
│   ├── decorators/
│   │   └── public.decorator.ts # @Public() decorator
│   └── dto/
│       └── auth.dto.ts         # Data transfer objects
├── app.module.ts               # Main app module (imports AuthModule)
└── prisma.service.ts           # Prisma client service
```

## Next Steps

1. **Update JWT_SECRET**: Generate a strong secret for production
2. **Configure CORS**: Set up CORS if frontend is on different domain
3. **Add Validation**: Install `class-validator` and `class-transformer` for DTO validation
4. **Rate Limiting**: Add rate limiting to prevent brute force attacks
5. **Logging**: Add authentication event logging
6. **Refresh Tokens**: Implement refresh token mechanism for better UX

## Troubleshooting

### Database Connection Error

- Ensure PostgreSQL is running
- Verify DATABASE_URL in .env file
- Check database credentials

### Prisma Client Errors

- Run `pnpm db:generate` after schema changes
- Run `pnpm db:migrate` to apply migrations

### JWT Verification Errors

- Ensure JWT_SECRET is the same in all environments
- Check token hasn't expired
- Verify token format: `Bearer <token>`

### Build Script Warning (bcrypt)

If you see warnings about ignored build scripts for bcrypt, run:

```bash
pnpm approve-builds
```

Then select bcrypt to allow it to run its build scripts.

## Documentation

See [AUTHENTICATION.md](../../AUTHENTICATION.md) for detailed documentation about the authentication system.

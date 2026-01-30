# Authentication Documentation

## Overview

This authentication system implements JWT-based authentication for the LicenseBox API. The system is designed for internal use only and does not include public user registration endpoints.

## Architecture

### Components

1. **AuthModule** - Main authentication module that configures JWT and registers the global auth guard
2. **AuthService** - Handles authentication logic, password hashing, and user validation
3. **AuthController** - Exposes authentication endpoints (login, profile)
4. **AuthGuard** - Global guard that protects all routes by default
5. **Public Decorator** - Custom decorator to mark routes as publicly accessible

## Features

- ✅ JWT-based authentication
- ✅ Password hashing with bcrypt
- ✅ Global authentication guard (all routes protected by default)
- ✅ Public route decorator for exceptions
- ✅ User active status checking
- ✅ Token expiration handling
- ✅ Secure password validation

## Environment Variables

Add these to your `.env` file at the **project root**:

```env
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
ADMIN_EMAIL="admin@licensebox.com"
ADMIN_PASSWORD="change-this-secure-admin-password"
```

⚠️ **Important**: Always use a strong, unique JWT_SECRET and ADMIN_PASSWORD in production and store them securely (e.g., in a secrets manager).

## Database Schema

The User model includes:

- `id` - UUID primary key
- `email` - Unique email address
- `password` - Hashed password (bcrypt)
- `name` - Optional user name
- `isActive` - Account active status
- `createdAt` - Creation timestamp
- `updatedAt` - Update timestamp

## API Endpoints

### Public Endpoints

#### POST /auth/login

Login with email and password.

**Request:**

```json
{
  "email": "admin@licensebox.com",
  "password": "your-password"
}
```

**Response:**

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

### Protected Endpoints

All other endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

#### GET /auth/profile

Returns the JWT payload (basic user info).

**Response:**

```json
{
  "sub": "user-uuid",
  "email": "admin@licensebox.com",
  "iat": 1706543210,
  "exp": 1707148010
}
```

#### GET /auth/me

Returns full user information from the database.

**Response:**

```json
{
  "id": "uuid",
  "email": "admin@licensebox.com",
  "name": "Admin User",
  "isActive": true
}
```

## Usage Examples

### Making Authenticated Requests

```typescript
// Login first
const loginResponse = await fetch('http://localhost:3000/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@licensebox.com',
    password: 'your-admin-password', // Use the password from ADMIN_PASSWORD env variable
  }),
});

const { access_token } = await loginResponse.json();

// Use token for subsequent requests
const profileResponse = await fetch('http://localhost:3000/auth/me', {
  headers: {
    Authorization: `Bearer ${access_token}`,
  },
});
```

### Creating Public Routes

To make a route publicly accessible (no authentication required), use the `@Public()` decorator:

```typescript
import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/decorators/public.decorator';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check() {
    return { status: 'ok' };
  }
}
```

### Accessing Current User in Controllers

The authenticated user is automatically attached to the request object:

```typescript
import { Controller, Get, Request } from '@nestjs/common';

@Controller('licenses')
export class LicensesController {
  @Get('my-licenses')
  async getMyLicenses(@Request() req) {
    const userId = req.user.sub; // User ID from JWT
    const email = req.user.email; // Email from JWT

    // Use userId to fetch user-specific data
    return this.licensesService.findByUserId(userId);
  }
}
```

## User Management

### Creating Users

Since there's no public registration, users must be created manually. You have two options:

#### 1. Using the Seed Script

First, set the admin credentials in your `.env` file at the project root:

```env
ADMIN_EMAIL="admin@licensebox.com"
ADMIN_PASSWORD="your-secure-password"
```

Then run the seed script:

```bash
cd packages/database
pnpm db:seed
```

Default seeded users:

- **Admin**: Email from `ADMIN_EMAIL` env / Password from `ADMIN_PASSWORD` env
- **John Doe**: john@example.com / password123
- **Jane Smith**: jane@example.com / password123

#### 2. Manual Creation via Prisma

```typescript
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createUser() {
  const hashedPassword = await bcrypt.hash('password123', 10);

  const user = await prisma.user.create({
    data: {
      email: 'newuser@example.com',
      name: 'New User',
      password: hashedPassword,
      isActive: true,
    },
  });

  return user;
}
```

### Deactivating Users

To deactivate a user (prevent login), set `isActive` to `false`:

```typescript
await prisma.user.update({
  where: { email: 'user@example.com' },
  data: { isActive: false },
});
```

## Security Best Practices

1. **JWT Secret**: Use a strong, unique secret in production
2. **Password Hashing**: Passwords are hashed with bcrypt (10 rounds)
3. **Token Expiration**: Configure appropriate expiration times
4. **HTTPS**: Always use HTTPS in production
5. **Environment Variables**: Never commit secrets to version control
6. **Password Policy**: Enforce strong password requirements
7. **Rate Limiting**: Consider adding rate limiting to login endpoint

## Testing Authentication

### cURL Examples

```bash
# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@licensebox.com","password":"your-admin-password"}'

# Note: Use the password you set in ADMIN_PASSWORD environment variable

# Get profile (replace TOKEN with actual token)
curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer TOKEN"
```

### Postman/Thunder Client

1. Create a POST request to `/auth/login`
2. Set body to JSON with email and password
3. Save the `access_token` from response
4. For protected routes, add Authorization header: `Bearer <token>`

## Troubleshooting

### "Unauthorized" errors

- Verify token is included in Authorization header
- Check token hasn't expired
- Ensure JWT_SECRET matches between token creation and verification

### "Invalid credentials"

- Verify email and password are correct
- Check user exists in database
- Ensure user `isActive` is true

### Token expiration

- Default expiration is 7 days
- Adjust `JWT_EXPIRES_IN` environment variable
- Implement refresh token mechanism for longer sessions

## Migration Notes

To apply the password field migration:

```bash
cd packages/database
pnpm exec prisma migrate dev --name add_password_field
```

Make sure your `DATABASE_URL` is set in your environment before running migrations.

## Next Steps

Consider implementing:

- [ ] Refresh token mechanism
- [ ] Password reset flow (email-based)
- [ ] Rate limiting on login endpoint
- [ ] Login attempt tracking
- [ ] Multi-factor authentication (MFA)
- [ ] Role-based access control (RBAC)
- [ ] API key authentication for programmatic access

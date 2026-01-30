# Admin User Setup Guide

This guide explains how to set up the initial admin user for LicenseBox.

## Quick Setup

### 1. Configure Admin Credentials

Create or edit the `.env` file at the **project root**:

```bash
cp .env.example .env
```

Edit the `.env` file and set your admin credentials:

```env
# Admin User Configuration
ADMIN_EMAIL="admin@licensebox.com"
ADMIN_PASSWORD="YourSecurePasswordHere123!"
```

**⚠️ IMPORTANT SECURITY NOTES:**

- Use a **strong, unique password** for the admin account
- Never commit the `.env` file to version control (it's already in `.gitignore`)
- Store production credentials in a secure secrets manager (AWS Secrets Manager, Azure Key Vault, etc.)
- Change the default admin email if needed
- Use at least 12 characters with a mix of uppercase, lowercase, numbers, and special characters

**⚠️ NOTE:** The database scripts now automatically load environment variables from the `.env` file at the project root.

### 2. Run Database Migrations

```bash
cd packages/database
pnpm db:generate
pnpm db:migrate
```

### 3. Seed the Admin User

```bash
cd packages/database
pnpm db:seed
```

You should see output like:

```
🌱 Seeding database...
✅ Admin user created: admin@licensebox.com
   Email: admin@licensebox.com
✅ Seeding completed!
```

### 4. Test Login

Start the API server:

```bash
cd apps/api
pnpm dev
```

Test the login:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@licensebox.com","password":"YourSecurePasswordHere123!"}'
```

You should receive a response with an access token:

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

## Environment Variables Explained

| Variable         | Description                                                 | Required |
| ---------------- | ----------------------------------------------------------- | -------- |
| `ADMIN_EMAIL`    | Email address for the admin user (used for login)           | Yes      |
| `ADMIN_PASSWORD` | Password for the admin user (will be hashed before storing) | Yes      |
| `JWT_SECRET`     | Secret key used to sign JWT tokens                          | Yes      |
| `JWT_EXPIRES_IN` | Token expiration time (e.g., "7d", "24h", "30m")            | No       |
| `DATABASE_URL`   | PostgreSQL connection string                                | Yes      |

## Re-seeding the Database

If you need to change the admin password or re-seed the database:

1. **Update the password** in your `.env` file
2. **Re-run the seed script**:

```bash
cd packages/database
pnpm db:seed
```

The seed script uses `upsert`, so it will:

- Create the admin user if it doesn't exist
- Skip updating if the user already exists (to preserve any changes)

If you want to force update the password, you'll need to either:

- Delete the user from the database first, OR
- Manually update the password in the database

## Production Deployment Checklist

Before deploying to production:

- [ ] Set a **strong, unique** `ADMIN_PASSWORD`
- [ ] Set a **strong, unique** `JWT_SECRET` (at least 32 random characters)
- [ ] Store secrets in a secure secrets manager (not in `.env` files)
- [ ] Use environment-specific email for `ADMIN_EMAIL`
- [ ] Enable HTTPS for all API endpoints
- [ ] Configure proper CORS settings
- [ ] Set up rate limiting on auth endpoints
- [ ] Enable logging and monitoring
- [ ] Set `NODE_ENV=production`

## Troubleshooting

### "ADMIN_PASSWORD environment variable is required" Error

**Problem:** The seed script can't find the `ADMIN_PASSWORD` environment variable.

**Solution:**

1. Make sure you created the `.env` file in `apps/api/`
2. Verify the variable is set: `ADMIN_PASSWORD="your-password"`
3. The seed script looks for the `.env` file at `apps/api/.env`

### Cannot Login After Seeding

**Problem:** Login fails with "Invalid credentials"

**Solutions:**

1. **Verify the password** you're using matches what's in your `.env` file
2. **Check the email** - make sure you're using the correct email from `ADMIN_EMAIL`
3. **Check the database** - verify the user was created:

```bash
cd packages/database
pnpm db:studio
```

Navigate to the `users` table and verify the admin user exists.

### Need to Reset Admin Password

1. **Option 1: Delete and Re-seed**

```bash
# Delete the user from database (using Prisma Studio or SQL)
cd packages/database
pnpm db:studio

# Then re-run seed
pnpm db:seed
```

2. **Option 2: Manual Update**

```typescript
// Create a script or use Prisma Studio
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function resetAdminPassword() {
  const newPassword = await bcrypt.hash('NewPassword123!', 10);

  await prisma.user.update({
    where: { email: 'admin@licensebox.com' },
    data: { password: newPassword },
  });

  console.log('Password updated successfully');
}

resetAdminPassword();
```

## Next Steps

After setting up the admin user:

1. **Test all auth endpoints** - Make sure login, profile, and protected routes work
2. **Create additional users** - Add other users via the API or seed script
3. **Set up RBAC** - Consider adding roles and permissions
4. **Configure password reset** - Implement password reset flow via email
5. **Enable MFA** - Add multi-factor authentication for enhanced security
6. **Set up audit logging** - Track authentication events

## Security Recommendations

1. **Password Requirements:**
   - Minimum 12 characters
   - Mix of uppercase and lowercase letters
   - At least one number
   - At least one special character
   - No common passwords or patterns

2. **Token Security:**
   - Use short expiration times (1-7 days)
   - Implement refresh tokens for longer sessions
   - Store tokens securely on the client side
   - Implement token revocation

3. **Account Security:**
   - Enable account lockout after failed login attempts
   - Implement password expiration policies
   - Add email verification
   - Log all authentication events
   - Monitor for suspicious activity

## Support

For more information, see:

- [AUTHENTICATION.md](AUTHENTICATION.md) - Complete authentication documentation
- [AUTH_SETUP.md](apps/api/AUTH_SETUP.md) - API setup instructions

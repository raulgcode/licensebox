import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables from project root if .env file exists
// In production, environment variables should be set by the system
const envPath = path.resolve(__dirname, '../../../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

async function main() {
  console.log('🌱 Seeding database...');

  // Get admin credentials from environment variables
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@licensebox.com';
  const adminPasswordRaw = process.env.ADMIN_PASSWORD;

  if (!adminPasswordRaw) {
    throw new Error(
      '❌ ADMIN_PASSWORD environment variable is required. Please set it in .env file at project root.',
    );
  }

  // Create admin user
  const adminPassword = await hashPassword(adminPasswordRaw);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Admin User',
      password: adminPassword,
      isActive: true,
    },
  });

  console.log('✅ Admin user created:', admin.email);
  console.log('   Email:', adminEmail);

  // Create sample users
  const user1Password = await hashPassword('password123');
  const user1 = await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      email: 'john@example.com',
      name: 'John Doe',
      password: user1Password,
      isActive: true,
    },
  });

  const user2Password = await hashPassword('password123');
  const user2 = await prisma.user.upsert({
    where: { email: 'jane@example.com' },
    update: {},
    create: {
      email: 'jane@example.com',
      name: 'Jane Smith',
      password: user2Password,
      isActive: true,
    },
  });

  // Create sample licenses
  await prisma.license.upsert({
    where: { key: 'DEMO-1234-5678-ABCD' },
    update: {},
    create: {
      key: 'DEMO-1234-5678-ABCD',
      product: 'Professional Plan',
      userId: user1.id,
      isActive: true,
      expiresAt: new Date('2026-12-31'),
    },
  });

  await prisma.license.upsert({
    where: { key: 'DEMO-9876-5432-WXYZ' },
    update: {},
    create: {
      key: 'DEMO-9876-5432-WXYZ',
      product: 'Enterprise Plan',
      userId: user2.id,
      isActive: true,
      expiresAt: new Date('2027-06-30'),
    },
  });

  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

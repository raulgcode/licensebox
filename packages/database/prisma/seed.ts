import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuid } from 'uuid';

// Load environment variables from project root if .env file exists
// In production, environment variables should be set by the system
const envPath = path.resolve(__dirname, '../../../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const prisma = new PrismaClient();
const GLOBAL_PSWD = 'Admin123!';
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

async function main() {
  console.log('🌱 Seeding database...');

  // Get admin credentials from environment variables
  const adminEmail = process.env.ADMIN_EMAIL || 'armandourbina@gmail.com';
  const adminPasswordRaw = process.env.ADMIN_PASSWORD || GLOBAL_PSWD;

  if (!adminPasswordRaw) {
    throw new Error(
      '❌ ADMIN_PASSWORD environment variable is required. Please set it in .env file at project root.',
    );
  }

  // Create admin user
  const adminPassword = await hashPassword(adminPasswordRaw);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: adminPassword,
      isActive: true,
    },
    create: {
      email: adminEmail,
      name: 'Raul Gonzalez',
      password: adminPassword,
      isActive: true,
    },
  });

  console.log('✅ Admin user created:', admin.email);
  console.log('   Email:', adminEmail);

  // Create sample users
  const user1Password = await hashPassword(GLOBAL_PSWD);
  const user1 = await prisma.user.upsert({
    where: { email: 'user@licensebox.com' },
    update: {},
    create: {
      email: 'user@licensebox.com',
      name: 'Dummy User',
      password: user1Password,
      isActive: true,
    },
  });

  const user2Password = await hashPassword(GLOBAL_PSWD);
  const user2 = await prisma.user.upsert({
    where: { email: 'saulo.montero@smgconsultores.com' },
    update: {},
    create: {
      email: 'saulo.montero@smgconsultores.com',
      name: 'Saulo Montero',
      password: user2Password,
      isActive: true,
    },
  });

  const user3Password = await hashPassword(GLOBAL_PSWD);
  const user3 = await prisma.user.upsert({
    where: { email: 'andreycm007@gmail.com' },
    update: {},
    create: {
      email: 'andreycm007@gmail.com',
      name: 'Andrey Caamaño',
      password: user3Password,
      isActive: true,
    },
  });

  console.log('✅ Sample users created:', user1.email, user2.email, user3.email);

  // Create sample clients
  const client1Id = uuid();
  const client1 = await prisma.client.upsert({
    where: { id: client1Id },
    update: {},
    create: {
      id: client1Id,
      name: 'EY Corp.',
      description: 'Leading global professional services',
      isActive: true,
    },
  });

  const client2Id = uuid();
  const client2 = await prisma.client.upsert({
    where: { id: client2Id },
    update: {},
    create: {
      id: client2Id,
      name: 'TechStart Inc.',
      description: 'Innovative startup solutions',
      isActive: true,
    },
  });

  console.log('✅ Sample clients created:', client1.name, client2.name);

  // Create sample licenses
  const key1 = uuid();
  await prisma.license.upsert({
    where: { key: key1 },
    update: {},
    create: {
      key: key1,
      product: 'Professional Plan',
      clientId: client1.id,
      isActive: true,
      expiresAt: new Date('2026-12-31'),
    },
  });

  const key2 = uuid();
  await prisma.license.upsert({
    where: { key: key2 },
    update: {},
    create: {
      key: key2,
      product: 'Enterprise Plan',
      clientId: client2.id,
      isActive: true,
      expiresAt: new Date('2027-06-30'),
    },
  });

  console.log('✅ Sample licenses created!');
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

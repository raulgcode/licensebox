import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const GLOBAL_PASSWORD = 'Admin123!';
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

async function main() {
  console.log('🌱 Seeding production database (users only)...');

  // Get admin credentials from environment variables
  const adminEmail = process.env.ADMIN_EMAIL || 'armandourbina@gmail.com';
  const adminPasswordRaw = process.env.ADMIN_PASSWORD || GLOBAL_PASSWORD;

  if (!adminPasswordRaw) {
    console.log('⚠️ ADMIN_PASSWORD not set, skipping admin user creation');
    return;
  }

  // Create/update admin user
  const adminPassword = await hashPassword(adminPasswordRaw);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: adminPassword,
    },
    create: {
      email: adminEmail,
      name: 'Raul Gonzalez',
      password: adminPassword,
      isActive: true,
    },
  });

  console.log('✅ Admin user created/updated:', admin.email);

  // Create sample users
  const user1Password = await hashPassword(GLOBAL_PASSWORD);
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

  const user2Password = await hashPassword(GLOBAL_PASSWORD);
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

  const user3Password = await hashPassword(GLOBAL_PASSWORD);
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

  console.log('✅ Production seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

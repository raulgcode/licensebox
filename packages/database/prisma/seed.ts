import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create sample users
  const user1 = await prisma.user.upsert({
    where: { email: "john@example.com" },
    update: {},
    create: {
      email: "john@example.com",
      name: "John Doe",
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: "jane@example.com" },
    update: {},
    create: {
      email: "jane@example.com",
      name: "Jane Smith",
    },
  });

  // Create sample licenses
  await prisma.license.upsert({
    where: { key: "DEMO-1234-5678-ABCD" },
    update: {},
    create: {
      key: "DEMO-1234-5678-ABCD",
      product: "Professional Plan",
      userId: user1.id,
      isActive: true,
      expiresAt: new Date("2026-12-31"),
    },
  });

  await prisma.license.upsert({
    where: { key: "DEMO-9876-5432-WXYZ" },
    update: {},
    create: {
      key: "DEMO-9876-5432-WXYZ",
      product: "Enterprise Plan",
      userId: user2.id,
      isActive: true,
      expiresAt: new Date("2027-06-30"),
    },
  });

  console.log("✅ Seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

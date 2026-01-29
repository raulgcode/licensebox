export { PrismaClient } from "@prisma/client";
export { PrismaService } from "./prisma.service";

// Re-export all Prisma types for use in other packages
export type { User, License, Prisma } from "@prisma/client";

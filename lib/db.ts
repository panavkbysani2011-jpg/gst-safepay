import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient across HMR reloads in dev to avoid exhausting
// connections. In production a single instance per lambda/server is created.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

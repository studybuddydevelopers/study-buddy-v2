// lib/prisma.ts
import { Prisma, PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSchema?: string;
};

// Fast Refresh can retain a client created before `prisma generate`. Reusing
// that instance would leave newly generated models/fields unavailable at runtime.
const development = process.env.NODE_ENV !== "production";
const schema = development
  ? JSON.stringify({ version: Prisma.prismaVersion.client, datamodel: Prisma.dmmf.datamodel })
  : undefined;
const cached = development ? globalForPrisma.prisma : undefined;

export const prisma = cached && globalForPrisma.prismaSchema === schema
  ? cached
  : new PrismaClient();

if (development) {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSchema = schema;
  if (cached && cached !== prisma) void cached.$disconnect().catch(() => {});
}

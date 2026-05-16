import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Please check your .env file and ensure DATABASE_URL is configured."
    );
  }

  try {
    const adapter = new PrismaPg({ connectionString });
    return new PrismaClient({ adapter });
  } catch (error) {
    console.error("Failed to initialize Prisma client:", error);
    throw new Error(
      `Failed to connect to database. Please verify your DATABASE_URL is correct. Details: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

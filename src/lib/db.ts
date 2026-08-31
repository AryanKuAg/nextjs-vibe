import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { 
  prisma: PrismaClient,
  pgPool: Pool
}

const pool = globalForPrisma.pgPool || new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 15000, // increased to 15s to allow for DB cold starts
  idleTimeoutMillis: 30000
})
const adapter = new PrismaPg(pool)

export const prisma = globalForPrisma.prisma || new PrismaClient({ 
  adapter,
  transactionOptions: {
    maxWait: 15000, // increased to match pool connection timeout
    timeout: 20000,
  }
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  globalForPrisma.pgPool = pool
}

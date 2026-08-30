import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { 
  prisma: PrismaClient,
  pgPool: Pool
}

// DATABASE_URL is the pooled connection (Supabase's Supavisor on 6543), not the
// database host itself — see env.example. `max` is per serverless instance, so
// the load the pooler actually sees is this times however many instances Vercel
// has warm; if connections start being refused under traffic, this is the knob.
// The 15s connect timeout below was set for Neon's scale-to-zero cold starts.
// Supabase's compute is always on, so it is now just slack, and harmless.
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

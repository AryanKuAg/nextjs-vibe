import { config } from 'dotenv';
config();

export default {
  datasource: {
    // Migrations must NOT go through Supabase's transaction pooler: `prisma
    // migrate` takes a session-level advisory lock and issues DDL, neither of
    // which survive a connection that is handed to another client between
    // statements. DIRECT_URL is the unpooled connection for exactly this, and
    // falling back to DATABASE_URL keeps a single-URL setup (or a plain local
    // Postgres) working with no extra configuration.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
}

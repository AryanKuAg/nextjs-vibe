import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = 'Usage'`;
    console.log('Columns in Usage table:', result);
  } catch (error) {
    console.error('Failed to connect to DB:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

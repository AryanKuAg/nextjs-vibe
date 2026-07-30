import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const messages = await prisma.message.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
  });
  console.log(JSON.stringify(messages, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());

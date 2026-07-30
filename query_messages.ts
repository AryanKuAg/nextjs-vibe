import { prisma } from './src/lib/db';
async function main() {
  const messages = await prisma.message.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
  });
  console.log(JSON.stringify(messages, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());

import { prisma } from './src/lib/db';
async function main() {
  const usages = await prisma.usage.findMany();
  console.log(usages);
}
main();

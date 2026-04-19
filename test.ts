import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const allUsage = await prisma.usage.findMany();
  console.log(JSON.stringify(allUsage, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());

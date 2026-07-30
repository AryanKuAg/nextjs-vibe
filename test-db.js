const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
async function main() {
  const prisma = new PrismaClient();
  const usages = await prisma.usage.findMany();
  console.log(usages);
}
main();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const clients = await prisma.client.findMany({
    select: { id: true, name: true },
    take: 10
  });
  console.log('Available clients:');
  clients.forEach(c => console.log(`  - ${c.name} (${c.id})`));
  await prisma.$disconnect();
})();

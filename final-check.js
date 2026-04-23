const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const ticket = await prisma.issue.findFirst({
    where: { ticketKey: 'CRVO-1021' },
    select: { id: true, ticketKey: true }
  });
  
  const count = await prisma.similarResolution.count({
    where: { issueId: ticket.id }
  });
  
  console.log(`CRVO-1021 (${ticket.id}): ${count} similar resolutions stored`);
  
  await prisma.$disconnect();
})();

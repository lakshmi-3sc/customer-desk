const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const client = await prisma.client.findFirst({ where: { name: 'Colgate-Palmolive India' } });
    
    const tickets = await prisma.issue.findMany({
      where: { clientId: client.id },
      select: { ticketKey: true, title: true, status: true },
      orderBy: { createdAt: 'desc' },
      take: 15
    });

    console.log('Colgate-Palmolive Tickets:\n');
    tickets.forEach(t => {
      console.log(`${t.ticketKey} - ${t.title.substring(0, 50)} (${t.status})`);
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
})();

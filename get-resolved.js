const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const client = await prisma.client.findFirst({ where: { name: 'Colgate-Palmolive India' } });
    
    console.log('RESOLVED TICKETS (with threaded discussions):\n');
    
    const resolved = await prisma.issue.findMany({
      where: { clientId: client.id, status: { in: ['RESOLVED', 'CLOSED'] } },
      select: { ticketKey: true, title: true, status: true, comments: { select: { id: true, parentId: true } } },
      orderBy: { resolvedAt: 'desc' }
    });

    resolved.forEach(t => {
      const replies = t.comments.filter(c => c.parentId).length;
      console.log(`${t.ticketKey} - ${t.title}`);
      console.log(`  Status: ${t.status} | Discussion replies: ${replies}`);
      console.log('');
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
})();

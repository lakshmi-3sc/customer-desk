const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const client = await prisma.client.findFirst({ where: { name: 'Colgate-Palmolive India' } });
    
    console.log('=== DEBUG SIMILAR RESOLUTIONS ===\n');
    
    // Check new tickets
    const newTickets = await prisma.issue.findMany({
      where: { clientId: client.id, status: 'OPEN' },
      select: { id: true, ticketKey: true, title: true, category: true },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    console.log('Recent OPEN tickets:');
    newTickets.forEach(t => console.log(`  ${t.ticketKey || t.id.slice(0,8)} - ${t.title.substring(0,40)}`));
    
    // Check if similar resolutions exist
    const totalSimilar = await prisma.similarResolution.count({
      where: { issue: { clientId: client.id } }
    });
    
    console.log(`\nTotal similar resolutions in DB: ${totalSimilar}`);
    
    // Check CRVO-1008 (our reference ticket)
    const crvo1008 = await prisma.issue.findFirst({
      where: { clientId: client.id, ticketKey: 'CRVO-1008' },
      select: { id: true, title: true, category: true }
    });
    
    if (crvo1008) {
      console.log(`\nCRVO-1008 found: ${crvo1008.title}`);
      console.log(`Category: ${crvo1008.category}`);
    }
    
    // Check for new replenishment tickets
    const replenish = await prisma.issue.findMany({
      where: { 
        clientId: client.id, 
        title: { contains: 'replenish', mode: 'insensitive' },
        status: 'OPEN'
      },
      select: { id: true, ticketKey: true, title: true, category: true },
      take: 3
    });
    
    console.log('\nReplenishment-related OPEN tickets:');
    replenish.forEach(t => {
      console.log(`  ${t.ticketKey || t.id.slice(0,8)} - ${t.title.substring(0,50)}`);
      console.log(`    Category: ${t.category}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();

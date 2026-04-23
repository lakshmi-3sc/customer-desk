const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const client = await prisma.client.findFirst({ where: { name: 'Colgate-Palmolive India' } });
    const user = await prisma.user.findFirst({ where: { clientMembers: { some: { clientId: client.id } } } });
    const project = await prisma.project.findFirst({ where: { clientId: client.id } });

    // Create test ticket similar to "Export to Excel drops columns..."
    const ticket = await prisma.issue.create({
      data: {
        title: 'Excel export missing columns when 60 products selected',
        description: 'Export functionality broken',
        category: 'BUG',
        priority: 'HIGH',
        status: 'OPEN',
        clientId: client.id,
        projectId: project.id,
        raisedById: user.id,
        ticketKey: `TEST-${Date.now()}`
      }
    });

    console.log(`Created: ${ticket.ticketKey}\n`);
    await new Promise(r => setTimeout(r, 2000));

    // Fetch similar resolutions
    const similar = await prisma.similarResolution.findMany({
      where: { issueId: ticket.id },
      include: {
        similarResolved: {
          select: {
            id: true,
            title: true,
            comments: { select: { content: true }, take: 1 }
          }
        }
      }
    });

    console.log(`Similar tickets found: ${similar.length}`);
    similar.forEach((s, i) => {
      console.log(`\n${i + 1}. "${s.similarResolved.title}"`);
      console.log(`   Score: ${s.similarityScore}%`);
      if (s.similarResolved.comments.length > 0) {
        console.log(`   Resolution hint: "${s.similarResolved.comments[0].content.substring(0, 60)}..."`);
      }
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();

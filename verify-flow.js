const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('=== VERIFICATION ===\n');
    
    // 1. Check database
    const ticket = await prisma.issue.findFirst({
      where: { ticketKey: 'CRVO-1021' },
      select: { id: true, ticketKey: true }
    });
    
    console.log(`1. Ticket CRVO-1021 ID: ${ticket.id}\n`);
    
    // 2. Check if similar resolutions stored
    const similar = await prisma.similarResolution.findMany({
      where: { issueId: ticket.id },
      include: { 
        similarResolved: { 
          select: { ticketKey: true, title: true, comments: { select: { content: true }, take: 1 } } 
        } 
      }
    });
    
    console.log(`2. Similar resolutions in DB: ${similar.length}`);
    if (similar.length > 0) {
      similar.forEach(s => {
        console.log(`   ✓ ${s.similarResolved.ticketKey}: ${s.similarityScore}% match`);
        console.log(`   Resolution: "${s.similarResolved.comments[0]?.content.substring(0,50)}..."`);
      });
    } else {
      console.log('   ✗ NO SIMILAR RESOLUTIONS STORED!');
    }
    
    // 3. Simulate API call
    console.log(`\n3. API call simulation:`);
    const apiResult = await prisma.similarResolution.findMany({
      where: { issueId: ticket.id },
      orderBy: { similarityScore: 'desc' },
      take: 3,
      include: {
        similarResolved: {
          select: {
            id: true,
            ticketKey: true,
            title: true,
            category: true,
            priority: true,
            resolvedAt: true,
            assignedTo: { select: { name: true } },
          },
        },
      },
    });
    
    const comments = await prisma.comment.findMany({
      where: { issueId: { in: apiResult.map(r => r.similarResolved.id) } },
      select: { issueId: true, content: true },
      orderBy: { createdAt: 'desc' }
    });
    
    const response = apiResult.map((record) => {
      const ticketComments = comments
        .filter(c => c.issueId === record.similarResolved.id)
        .slice(0, 2);
      return {
        id: record.similarResolved.id,
        ticketKey: record.similarResolved.ticketKey,
        title: record.similarResolved.title,
        similarityScore: record.similarityScore,
        resolutionHints: ticketComments.map(c => c.content),
      };
    });
    
    console.log(`   Would return: ${response.length} tickets`);
    console.log(JSON.stringify(response, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();

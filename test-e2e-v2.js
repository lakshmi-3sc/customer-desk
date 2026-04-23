const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const client = await prisma.client.findFirst({
      where: { name: 'Colgate-Palmolive India' }
    });
    
    const user = await prisma.user.findFirst({
      where: { clientMembers: { some: { clientId: client.id } } }
    });
    
    const project = await prisma.project.findFirst({
      where: { clientId: client.id }
    });

    // Create a test ticket that's SIMILAR to existing ones (by category and some words)
    const testTicket = await prisma.issue.create({
      data: {
        title: 'Excel export corrupting column data when selecting more than 40 products',
        description: 'Users report that when exporting more than 40 products to Excel, some columns are missing or corrupted',
        category: 'BUG', // Same category as resolved tickets
        priority: 'HIGH',
        status: 'OPEN',
        clientId: client.id,
        projectId: project.id,
        raisedById: user.id,
        ticketKey: `SIM-TEST-${Date.now()}`
      }
    });
    console.log(`✓ Created test ticket: ${testTicket.ticketKey}`);
    console.log(`  Title: "${testTicket.title}"`);
    console.log(`  Category: ${testTicket.category}`);
    console.log('\n⏳ Waiting 5 seconds for background computation...');
    await new Promise(r => setTimeout(r, 5000));

    // Check results
    const similar = await prisma.similarResolution.findMany({
      where: { issueId: testTicket.id },
      include: {
        similarResolved: { select: { title: true, ticketKey: true } }
      },
      orderBy: { similarityScore: 'desc' }
    });

    console.log(`\n✓ Results: ${similar.length} similar tickets found\n`);
    if (similar.length > 0) {
      similar.forEach((s, i) => {
        console.log(`${i + 1}. "${s.similarResolved.title}"`);
        console.log(`   Score: ${s.similarityScore}/100 (${s.method})`);
      });
    }

    console.log(`\n✓ API endpoint: /api/dashboard/similar-tickets?ticketId=${testTicket.id}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();

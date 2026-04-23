const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // 1. Get Colgate-Palmolive India client
    const client = await prisma.client.findFirst({
      where: { name: 'Colgate-Palmolive India' }
    });
    
    if (!client) {
      console.log('❌ Colgate-Palmolive India client not found');
      process.exit(1);
    }
    console.log(`✓ Found client: ${client.name}`);

    // 2. Get a user from this client
    const user = await prisma.user.findFirst({
      where: { clientMembers: { some: { clientId: client.id } } }
    });
    
    if (!user) {
      console.log('❌ No user found for this client');
      process.exit(1);
    }
    console.log(`✓ Using user: ${user.name}`);

    // 3. Get first project
    const project = await prisma.project.findFirst({
      where: { clientId: client.id }
    });
    
    if (!project) {
      console.log('❌ No project found');
      process.exit(1);
    }
    console.log(`✓ Using project: ${project.name}`);

    // 4. Check for resolved tickets
    const resolved = await prisma.issue.findMany({
      where: {
        clientId: client.id,
        status: { in: ['RESOLVED', 'CLOSED'] }
      },
      select: { id: true, title: true, category: true },
      take: 5
    });
    
    console.log(`✓ Found ${resolved.length} resolved tickets`);
    if (resolved.length > 0) {
      console.log('  Sample resolved tickets:');
      resolved.forEach(t => console.log(`    - ${t.title} (${t.category})`));
    }

    // 5. Create a test ticket
    const testTicket = await prisma.issue.create({
      data: {
        title: 'Database connection issue with report generation',
        description: 'Users experiencing timeouts when generating reports with large datasets',
        category: resolved.length > 0 ? resolved[0].category : 'BUG',
        priority: 'HIGH',
        status: 'OPEN',
        clientId: client.id,
        projectId: project.id,
        raisedById: user.id,
        ticketKey: `SIM-TEST-${Date.now()}`
      }
    });
    console.log(`\n✓ Created test ticket: ${testTicket.ticketKey}`);
    console.log(`  Title: ${testTicket.title}`);

    // 6. Wait for background computation (computeSimilarResolutions is called asynchronously)
    console.log('\n⏳ Waiting 4 seconds for background computation...');
    await new Promise(r => setTimeout(r, 4000));

    // 7. Check if similar resolutions were stored
    const similar = await prisma.similarResolution.findMany({
      where: { issueId: testTicket.id },
      include: {
        similarResolved: { select: { title: true, ticketKey: true, id: true } }
      },
      orderBy: { similarityScore: 'desc' }
    });

    console.log(`\n✓ Similar resolution records found: ${similar.length}`);
    if (similar.length > 0) {
      similar.forEach((s, i) => {
        console.log(`\n  Match ${i + 1}:`);
        console.log(`    Similar ID: ${s.similarResolved.id}`);
        console.log(`    Title: ${s.similarResolved.title}`);
        console.log(`    Similarity Score: ${s.similarityScore}/100`);
        console.log(`    Method: ${s.method}`);
      });
    } else {
      console.log('  (No similar resolutions found - this might mean no resolved tickets match)');
    }

    // 8. Show API endpoint URL
    console.log(`\n✓ API would be called with: GET /api/dashboard/similar-tickets?ticketId=${testTicket.id}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
})();

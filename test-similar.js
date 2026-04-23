const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Check if SimilarResolution table exists by trying to count records
    const count = await prisma.similarResolution.count();
    console.log(`✓ SimilarResolution table exists with ${count} records`);
    
    // Show a few recent similar resolutions if any exist
    if (count > 0) {
      const recent = await prisma.similarResolution.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
        include: { 
          issue: { select: { title: true, ticketKey: true } },
          similarResolved: { select: { title: true, ticketKey: true } }
        }
      });
      console.log('\nRecent similar resolutions:');
      recent.forEach(r => {
        console.log(`  ${r.issue.ticketKey || r.issue.title} → ${r.similarResolved.ticketKey || r.similarResolved.title} (score: ${r.similarityScore})`);
      });
    } else {
      console.log('No similar resolutions stored yet.');
      console.log('This is normal - they will be computed when new tickets are created.');
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();

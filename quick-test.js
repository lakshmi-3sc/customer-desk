const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const count = await prisma.similarResolution.count();
    console.log(`✓ Prisma working - Total similar resolutions: ${count}`);
    
    const ticket = await prisma.issue.findFirst({
      where: { ticketKey: 'CRVO-1021' },
      select: { id: true }
    });
    
    const similar = await prisma.similarResolution.findMany({
      where: { issueId: ticket.id }
    });
    
    console.log(`✓ CRVO-1021 has ${similar.length} similar resolutions`);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();

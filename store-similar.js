const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Get CRVO-1021
    const ticket = await prisma.issue.findFirst({
      where: { ticketKey: 'CRVO-1021' },
      select: { id: true }
    });

    // Get CRVO-1008
    const resolved = await prisma.issue.findFirst({
      where: { ticketKey: 'CRVO-1008' },
      select: { id: true }
    });

    // Store similarity
    await prisma.similarResolution.create({
      data: {
        issueId: ticket.id,
        similarResolvedId: resolved.id,
        similarityScore: 36,
        method: "word"
      }
    });

    console.log('✓ CRVO-1021 → CRVO-1008 (36% match) stored');
    console.log('✓ Now check ticket CRVO-1021 → right sidebar should show similar resolved ticket');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();

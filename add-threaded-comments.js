const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const client = await prisma.client.findFirst({ where: { name: 'Colgate-Palmolive India' } });
    const user = await prisma.user.findFirst({ where: { clientMembers: { some: { clientId: client.id } } } });

    const resolved = await prisma.issue.findMany({
      where: { clientId: client.id, status: { in: ['RESOLVED', 'CLOSED'] } },
      select: { id: true, title: true, comments: { select: { id: true, content: true } } },
      take: 5
    });

    const threads = {
      'Export to Excel drops columns when more than 50 products selected': [
        'Customer confirmed: Excel export stops working after ~50 products',
        'Tested locally - can reproduce with 55 products, works fine with 40',
        'Found issue: ExportService.ts has hardcoded limit of 50. Changed to 100.',
        'Tested fix in staging - now exports 100+ products correctly',
        'Deployed to production. Customer confirmed - issue resolved!'
      ],
      'Reorder point calculation ignoring lead time buffer': [
        'Reorder calculation seems wrong - not accounting for delivery delays',
        'Checked inventory calculations - lead time field exists but not used',
        'Root cause: lead time in days, but calculation treats it as hours',
        'Fixed conversion: 30 days = 720 hours. Added unit tests.',
        'Verified fix works correctly. Customer confirmed inventory levels now accurate.'
      ],
      'Auto-replenishment orders triggering on public holidays': [
        'Orders placed on holidays when they should wait until next business day',
        'Checked replenishment logic - no holiday calendar integration',
        'Created HolidayService to check dates before triggering replenishment',
        'Configured Indian holidays list in settings',
        'Testing shows orders now skip holidays. Deployed successfully.'
      ]
    };

    for (const ticket of resolved) {
      const threadMessages = threads[ticket.title];
      if (!threadMessages) continue;

      // Get or create root comment (resolution comment)
      let rootComment = ticket.comments[0];
      if (!rootComment) continue;

      console.log(`Adding thread to: ${ticket.title.substring(0, 40)}...`);

      // Add replies
      for (let i = 1; i < threadMessages.length; i++) {
        await prisma.comment.create({
          data: {
            issueId: ticket.id,
            authorId: user.id,
            content: threadMessages[i],
            isInternal: false,
            parentId: rootComment.id
          }
        });
      }
    }

    console.log('\n✓ Threaded comments added to resolved tickets');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();

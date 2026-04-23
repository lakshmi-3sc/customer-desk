const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const client = await prisma.client.findFirst({ where: { name: 'Colgate-Palmolive India' } });
    const user = await prisma.user.findFirst({ 
      where: { clientMembers: { some: { clientId: client.id } } }
    });

    const resolved = await prisma.issue.findMany({
      where: { clientId: client.id, status: { in: ['RESOLVED', 'CLOSED'] } },
      select: { id: true, title: true }
    });

    const resolutions = {
      'Export to Excel drops columns when more than 50 products selected': 'Fixed by updating Excel export batch size from 50 to 100 rows. Issue was hardcoded limit in ExportService.ts line 245. Optimized memory by streaming instead of buffering.',
      'Reorder point calculation ignoring lead time buffer': 'Root cause: lead time field in days but calculation expected hours. Fixed conversion in InventoryCalculator line 156. Added unit test for 30-day = 720 hour conversion.',
      'Auto-replenishment orders triggering on public holidays': 'Integrated holiday calendar to skip replenishment on holidays. Created HolidayService that checks date before triggering orders.',
      'PP Gantt chart not rendering for more than 4 weeks': 'Performance fix: changed from day-by-day rendering to week grouping for >30 day spans. Reduced DOM elements from 200 to 20. Now renders instantly.',
      'PP module showing 404 error for production planner accounts': 'Role-based access issue. Added PRODUCTION_PLANNER to allowed roles in auth middleware (auth.ts line 89).'
    };

    for (const ticket of resolved) {
      if (!resolutions[ticket.title]) continue;
      await prisma.comment.create({
        data: {
          issueId: ticket.id,
          authorId: user.id,
          content: resolutions[ticket.title],
          isInternal: false
        }
      });
      console.log(`✓ ${ticket.title.substring(0, 50)}...`);
    }

    console.log('\n✓ Comments added');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();

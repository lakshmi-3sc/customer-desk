const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const ticket = await prisma.issue.findFirst({
    where: { ticketKey: 'TEST-1776919732115' },
    select: { id: true }
  });

  // Simulate what the API does
  const similarRecords = await prisma.similarResolution.findMany({
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

  // Fetch comments
  const similarIds = similarRecords.map(r => r.similarResolved.id);
  const comments = await prisma.comment.findMany({
    where: { issueId: { in: similarIds } },
    select: { issueId: true, content: true, author: { select: { name: true } } },
    orderBy: { createdAt: 'desc' }
  });

  const similar = similarRecords.map((record) => {
    const ticketComments = comments
      .filter(c => c.issueId === record.similarResolved.id)
      .slice(0, 2);

    return {
      id: record.similarResolved.id,
      ticketKey: record.similarResolved.ticketKey,
      title: record.similarResolved.title,
      category: record.similarResolved.category,
      priority: record.similarResolved.priority,
      resolvedAt: record.similarResolved.resolvedAt,
      assignedTo: record.similarResolved.assignedTo,
      similarityScore: record.similarityScore,
      method: record.method,
      resolutionHints: ticketComments.map(c => c.content),
    };
  });

  console.log(JSON.stringify(similar, null, 2));
  await prisma.$disconnect();
})();

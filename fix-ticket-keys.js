const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateTicketKey(projectId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { name: true }
  });
  
  let prefix = "TKT";
  if (project) {
    prefix = project.name
      .split(/\s+/)
      .map(w => (w[0] || ''))
      .filter(c => /[A-Za-z]/.test(c))
      .join('')
      .toUpperCase()
      .slice(0, 4);
  }

  const count = await prisma.issue.count({
    where: { ticketKey: { startsWith: `${prefix}-` } }
  });

  return `${prefix}-${1000 + count + 1}`;
}

(async () => {
  try {
    const client = await prisma.client.findFirst({ where: { name: 'Colgate-Palmolive India' } });
    
    const ticketsWithoutKeys = await prisma.issue.findMany({
      where: { 
        clientId: client.id,
        OR: [
          { ticketKey: null },
          { ticketKey: '' }
        ]
      },
      select: { id: true, projectId: true, title: true }
    });

    console.log(`Found ${ticketsWithoutKeys.length} tickets without proper keys\n`);

    for (const ticket of ticketsWithoutKeys) {
      const newKey = await generateTicketKey(ticket.projectId);
      await prisma.issue.update({
        where: { id: ticket.id },
        data: { ticketKey: newKey }
      });
      console.log(`✓ ${newKey} - ${ticket.title.substring(0, 50)}`);
    }

    console.log(`\n✓ All tickets now have proper ticket keys`);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();

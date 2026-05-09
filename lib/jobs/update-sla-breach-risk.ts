import { prisma } from "@/lib/prisma";

async function updateSlaBreachRisk() {
  console.log("⏰ Updating slaBreachRisk field for tickets...\n");

  const now = new Date();
  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  // Find all OPEN/ACKNOWLEDGED/IN_PROGRESS tickets where SLA is not breached but due within 2 hours
  const atRiskTickets = await prisma.issue.findMany({
    where: {
      status: { in: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"] },
      slaBreached: false,
      slaDueAt: {
        lte: twoHoursFromNow,
        gte: now,
      },
    },
  });

  console.log(`Found ${atRiskTickets.length} tickets with SLA at risk (within 2 hours)\n`);

  let updated = 0;
  for (const ticket of atRiskTickets) {
    await prisma.issue.update({
      where: { id: ticket.id },
      data: { slaBreachRisk: true },
    });
    updated++;
    console.log(`✓ Updated: ${ticket.ticketKey || ticket.id} (due at ${ticket.slaDueAt?.toISOString()})`);
  }

  console.log(`\n✅ Updated ${updated} tickets with slaBreachRisk = true`);
}

updateSlaBreachRisk()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

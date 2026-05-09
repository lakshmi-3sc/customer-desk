import { prisma } from "@/lib/prisma";

async function fixSLADatesForAnalytics() {
  console.log("📊 Adjusting SLA due dates to spread across time period...\n");

  const now = new Date();

  // Get all recent tickets (created in last 100 days)
  const recentTickets = await prisma.issue.findMany({
    where: {
      createdAt: {
        gte: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${recentTickets.length} recent tickets\n`);

  let updated = 0;

  for (const ticket of recentTickets) {
    // Calculate days since creation
    const daysSinceCreation = Math.floor(
      (now.getTime() - ticket.createdAt.getTime()) / (24 * 60 * 60 * 1000)
    );

    // Set slaDueAt based on priority, relative to creation date
    let slaDueAtDate: Date;

    if (ticket.priority === "CRITICAL") {
      // CRITICAL: due 4 hours after creation
      slaDueAtDate = new Date(ticket.createdAt.getTime() + 4 * 60 * 60 * 1000);
    } else if (ticket.priority === "HIGH") {
      // HIGH: due 24 hours after creation
      slaDueAtDate = new Date(ticket.createdAt.getTime() + 24 * 60 * 60 * 1000);
    } else if (ticket.priority === "MEDIUM") {
      // MEDIUM: due 72 hours after creation
      slaDueAtDate = new Date(ticket.createdAt.getTime() + 72 * 60 * 60 * 1000);
    } else {
      // LOW: due 7 days after creation
      slaDueAtDate = new Date(ticket.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    // Update the ticket
    await prisma.issue.update({
      where: { id: ticket.id },
      data: { slaDueAt: slaDueAtDate },
    });

    updated++;
  }

  console.log(`✅ Updated ${updated} tickets with proper SLA due dates`);
  console.log(`\nSLA calculation:`);
  console.log(`  • CRITICAL: 4 hours after creation`);
  console.log(`  • HIGH: 24 hours after creation`);
  console.log(`  • MEDIUM: 72 hours after creation`);
  console.log(`  • LOW: 7 days after creation`);
  console.log(`\nAnalytics chart should now show SLA line spread across the period!`);
}

fixSLADatesForAnalytics()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

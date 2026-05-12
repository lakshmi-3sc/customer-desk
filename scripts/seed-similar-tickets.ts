import { prisma } from "@/lib/prisma";

async function main() {
  console.log("🌱 Seeding similar resolved tickets for semantic search testing...\n");

  // Get Replenishment Planning project
  const rpProject = await prisma.project.findFirst({
    where: { name: "Replenishment Planning" },
  });

  if (!rpProject) {
    console.error("❌ Replenishment Planning project not found");
    process.exit(1);
  }

  // Get the first 3SC lead user
  const lead = await prisma.user.findFirst({
    where: { role: "THREESC_LEAD" },
  });

  if (!lead) {
    console.error("❌ No 3SC Lead user found");
    process.exit(1);
  }

  // Get Colgate Palmolive client
  const client = await prisma.client.findFirst({
    where: { name: "Colgate Palmolive" },
  });

  if (!client) {
    console.error("❌ Colgate Palmolive client not found");
    process.exit(1);
  }

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  // Similar tickets - all resolved, semantically related to stock depletion alerts
  const similarTickets = [
    {
      ticketKey: "RP-3001",
      title: "Safety stock alert not triggering for low inventory",
      description:
        "When inventory drops below safety stock level, the system fails to send alert notifications to the warehouse team. Manual monitoring is required.",
      category: "BUG",
      priority: "CRITICAL",
      createdAt: new Date(oneWeekAgo.getTime() - 5 * 24 * 60 * 60 * 1000),
      resolvedAt: twoDaysAgo,
    },
    {
      ticketKey: "RP-3002",
      title: "Reorder point notifications not sent for critical SKUs",
      description:
        "Replenishment alerts are not being generated when stock reaches reorder point for key products. This is causing supply chain delays and potential stockouts.",
      category: "BUG",
      priority: "HIGH",
      createdAt: new Date(oneWeekAgo.getTime() - 4 * 24 * 60 * 60 * 1000),
      resolvedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      ticketKey: "RP-3003",
      title: "Low stock warning system failing to trigger alerts",
      description:
        "The automatic stock depletion warning feature is not sending notifications. Warehouse staff are not getting alerts when inventory levels fall below thresholds.",
      category: "BUG",
      priority: "HIGH",
      createdAt: new Date(oneWeekAgo.getTime() - 3 * 24 * 60 * 60 * 1000),
      resolvedAt: twoDaysAgo,
    },
    {
      ticketKey: "RP-3004",
      title: "Replenishment alerts disabled after system configuration change",
      description:
        "After updating the inventory management settings, stock alert notifications stopped working. The alert trigger logic appears to be broken or disabled.",
      category: "BUG",
      priority: "CRITICAL",
      createdAt: new Date(oneWeekAgo.getTime() - 6 * 24 * 60 * 60 * 1000),
      resolvedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      ticketKey: "RP-3005",
      title: "Safety threshold notifications not reaching warehouse",
      description:
        "Stock alert notifications for items below safety level are not being delivered. The notification delivery system seems to have an issue with the alert routing.",
      category: "BUG",
      priority: "HIGH",
      createdAt: new Date(oneWeekAgo.getTime() - 2 * 24 * 60 * 60 * 1000),
      resolvedAt: twoDaysAgo,
    },
    {
      ticketKey: "RP-3006",
      title: "Inventory depletion alerts missing for bulk operations",
      description:
        "When stock levels are updated through batch operations, the alert system does not trigger even though items fall below critical thresholds. Manual verification required.",
      category: "BUG",
      priority: "HIGH",
      createdAt: new Date(oneWeekAgo.getTime() - 4 * 24 * 60 * 60 * 1000),
      resolvedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      ticketKey: "RP-3007",
      title: "Stock depletion warning notifications not functioning",
      description:
        "The warehouse management system is not sending alert notifications when stock quantities fall below the configured safety level. This is impacting inventory management.",
      category: "BUG",
      priority: "CRITICAL",
      createdAt: new Date(oneWeekAgo.getTime() - 1 * 24 * 60 * 60 * 1000),
      resolvedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
    },
    {
      ticketKey: "RP-3008",
      title: "Alert mechanism failing when safety stock thresholds breached",
      description:
        "Automated alerts that should trigger when inventory falls below safety stock levels are not working. The threshold checking logic may have a bug.",
      category: "BUG",
      priority: "HIGH",
      createdAt: new Date(oneWeekAgo.getTime() - 5 * 24 * 60 * 60 * 1000),
      resolvedAt: twoDaysAgo,
    },
  ];

  console.log(`📝 Inserting ${similarTickets.length} similar resolved tickets...\n`);

  for (const ticket of similarTickets) {
    await prisma.issue.upsert({
      where: { ticketKey: ticket.ticketKey },
      update: {},
      create: {
        ticketKey: ticket.ticketKey,
        title: ticket.title,
        description: ticket.description,
        priority: ticket.priority,
        status: "RESOLVED",
        category: ticket.category,
        clientId: client.id,
        projectId: rpProject.id,
        raisedById: lead.id,
        createdAt: ticket.createdAt,
        updatedAt: ticket.resolvedAt,
        resolvedAt: ticket.resolvedAt,
      },
    });

    console.log(`✅ ${ticket.ticketKey} - ${ticket.title}`);
  }

  console.log(`\n═══════════════════════════════════════════════════`);
  console.log(`✅ ${similarTickets.length} similar resolved tickets inserted!`);
  console.log(`\n📌 These tickets will show as "similar" when users create tickets with related keywords like:`);
  console.log(`   - "stock alert"  `);
  console.log(`   - "inventory depletion"`);
  console.log(`   - "safety threshold"  `);
  console.log(`   - "replenishment notification"`);
  console.log(`   - "low stock warning"\n`);
  console.log(`Now run the embedding backfill to enable semantic search:`);
  console.log(`npm run seed:escalations\n`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { prisma } from "@/lib/prisma";

async function main() {
  console.log("🌱 Starting seed...\n");

  // ─────────────────────────────────────────────────────────────
  // 1. Create/Get Client
  // ─────────────────────────────────────────────────────────────
  let client = await prisma.client.findFirst({
    where: { name: "Colgate Palmolive" },
  });

  if (!client) {
    client = await prisma.client.create({
      data: {
        name: "Colgate Palmolive",
        email: "support@colgate.com",
        isActive: true,
      },
    });
    console.log("✅ Created client: Colgate Palmolive");
  } else {
    console.log("✅ Client already exists: Colgate Palmolive");
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Create/Get Project
  // ─────────────────────────────────────────────────────────────
  let project = await prisma.project.findFirst({
    where: { name: "Production Planning" },
  });

  if (!project) {
    project = await prisma.project.create({
      data: {
        name: "Production Planning",
        description: "Production planning and batch processing system",
        clientId: client.id,
        isActive: true,
      },
    });
    console.log("✅ Created project: Production Planning");
  } else {
    console.log("✅ Project already exists: Production Planning");
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Create/Get Users (Agents & Lead)
  // ─────────────────────────────────────────────────────────────
  const ravi = await prisma.user.findFirst({
    where: { email: "ravi@3sc.com" },
  });

  const sneha = await prisma.user.findFirst({
    where: { email: "sneha@3sc.com" },
  });

  const lead = await prisma.user.findFirst({
    where: { role: "THREESC_LEAD" },
  });

  console.log(`✅ Found/Using Lead: ${lead?.name}`);
  console.log(`✅ Found/Using Agents: ${ravi?.name}, ${sneha?.name}\n`);

  // ─────────────────────────────────────────────────────────────
  // 4. Seed Escalation Test Tickets
  // ─────────────────────────────────────────────────────────────

  // RULE 1: CRITICAL Unassigned 30+ min
  console.log("📝 Creating Rule 1: CRITICAL Unassigned 30+ min");
  const rule1Ticket = await prisma.issue.upsert({
    where: { ticketKey: "PP-2001" },
    update: {},
    create: {
      ticketKey: "PP-2001",
      title: "Production server down - all users affected",
      description:
        "All production services are unreachable. Database server not responding. Critical impact on all operations.",
      priority: "CRITICAL",
      status: "OPEN",
      category: "INFRASTRUCTURE",
      clientId: client.id,
      projectId: project.id,
      raisedById: lead?.id || "",
      createdAt: new Date(Date.now() - 31 * 60 * 1000), // 31 minutes ago
      updatedAt: new Date(Date.now() - 31 * 60 * 1000),
      escalated: false,
    },
  });
  console.log(`  ✅ Created: ${rule1Ticket.ticketKey} (${rule1Ticket.title})\n`);

  // RULE 2: HIGH Unassigned 2+ hours
  console.log("📝 Creating Rule 2: HIGH Unassigned 2+ hours");
  const rule2Ticket = await prisma.issue.upsert({
    where: { ticketKey: "PP-2002" },
    update: {},
    create: {
      ticketKey: "PP-2002",
      title: "API response time degraded by 50%",
      description:
        "API endpoints are taking 5+ seconds to respond instead of 1 second. Performance degradation affecting user experience.",
      priority: "HIGH",
      status: "OPEN",
      category: "PERFORMANCE",
      clientId: client.id,
      projectId: project.id,
      raisedById: lead?.id || "",
      createdAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000), // 2.5 hours ago
      updatedAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000),
      escalated: false,
    },
  });
  console.log(`  ✅ Created: ${rule2Ticket.ticketKey} (${rule2Ticket.title})\n`);

  // RULE 3: SLA Breached
  console.log("📝 Creating Rule 3: SLA Breached");
  const slaDueAt = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours past due
  const rule3Ticket = await prisma.issue.upsert({
    where: { ticketKey: "PP-2003" },
    update: {},
    create: {
      ticketKey: "PP-2003",
      title: "Customer payment processing failed",
      description:
        "Stripe integration error preventing customer payments. Multiple orders stuck in pending state.",
      priority: "CRITICAL",
      status: "IN_PROGRESS",
      category: "BUG",
      clientId: client.id,
      projectId: project.id,
      raisedById: lead?.id || "",
      assignedToId: ravi?.id,
      slaDueAt: slaDueAt,
      slaBreached: true,
      slaBreachRisk: true,
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      escalated: false,
    },
  });
  console.log(`  ✅ Created: ${rule3Ticket.ticketKey} (${rule3Ticket.title})\n`);

  // RULE 4: Stuck IN_PROGRESS 48+ hours
  console.log("📝 Creating Rule 4: Stuck IN_PROGRESS 48+ hours");
  const rule4Ticket = await prisma.issue.upsert({
    where: { ticketKey: "PP-2004" },
    update: {},
    create: {
      ticketKey: "PP-2004",
      title: "Database migration blocked on dependencies",
      description:
        "Waiting for schema changes in upstream service. Migration started 2 days ago but no progress. Blocking other releases.",
      priority: "HIGH",
      status: "IN_PROGRESS",
      category: "INFRASTRUCTURE",
      clientId: client.id,
      projectId: project.id,
      raisedById: lead?.id || "",
      assignedToId: sneha?.id,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      updatedAt: new Date(Date.now() - 49 * 60 * 60 * 1000), // Updated 49 hours ago (no recent updates)
      escalated: false,
    },
  });
  console.log(`  ✅ Created: ${rule4Ticket.ticketKey} (${rule4Ticket.title})\n`);

  // RULE 5: Systemic Pattern (3+ same category from same client in 7 days)
  console.log("📝 Creating Rule 5: Systemic Pattern (3+ BUG from same client)");

  const systemic1 = await prisma.issue.upsert({
    where: { ticketKey: "PP-2005" },
    update: {},
    create: {
      ticketKey: "PP-2005",
      title: "Batch calculation rounding error - Order #001",
      description:
        "Batch qty calculation returning 99.9 instead of 100. Rounding error causing material shortage.",
      priority: "HIGH",
      status: "OPEN",
      category: "BUG",
      clientId: client.id,
      projectId: project.id,
      raisedById: lead?.id || "",
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      escalated: false,
    },
  });

  const systemic2 = await prisma.issue.upsert({
    where: { ticketKey: "PP-2006" },
    update: {},
    create: {
      ticketKey: "PP-2006",
      title: "Batch calculation giving wrong totals - Order #002",
      description:
        "Same rounding issue appearing again. Systemic problem in calculation logic.",
      priority: "HIGH",
      status: "OPEN",
      category: "BUG",
      clientId: client.id,
      projectId: project.id,
      raisedById: lead?.id || "",
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
      updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      escalated: false,
    },
  });

  const systemic3 = await prisma.issue.upsert({
    where: { ticketKey: "PP-2007" },
    update: {},
    create: {
      ticketKey: "PP-2007",
      title: "Material shortage due to incorrect batch qty",
      description:
        "Third occurrence of batch qty calculation error. Production line halted. Root cause needed.",
      priority: "HIGH",
      status: "OPEN",
      category: "BUG",
      clientId: client.id,
      projectId: project.id,
      raisedById: lead?.id || "",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      escalated: false,
    },
  });

  console.log(`  ✅ Created: ${systemic1.ticketKey}`);
  console.log(`  ✅ Created: ${systemic2.ticketKey}`);
  console.log(`  ✅ Created: ${systemic3.ticketKey}\n`);

  // ─────────────────────────────────────────────────────────────
  // 5. Summary
  // ─────────────────────────────────────────────────────────────
  console.log("═══════════════════════════════════════════════════════════");
  console.log("🎉 Seed completed successfully!\n");
  console.log("📋 Created Tickets:");
  console.log(`   Rule 1: ${rule1Ticket.ticketKey} - CRITICAL Unassigned (30+ min)`);
  console.log(`   Rule 2: ${rule2Ticket.ticketKey} - HIGH Unassigned (2+ hours)`);
  console.log(`   Rule 3: ${rule3Ticket.ticketKey} - SLA Breached`);
  console.log(`   Rule 4: ${rule4Ticket.ticketKey} - Stuck IN_PROGRESS (48+ hours)`);
  console.log(`   Rule 5: ${systemic1.ticketKey}, ${systemic2.ticketKey}, ${systemic3.ticketKey} - Systemic Pattern`);
  console.log("\n🔄 To trigger escalations, run:");
  console.log("   curl -X GET http://localhost:3000/api/cron/escalate \\");
  console.log('     -H "Authorization: Bearer xK9mP2jL8vQ5nR3bW6tY7uZ4cS1dE2fG3hJ4kL5mN6oP7qR8sT9uV0wX1yZ2aB3c"');
  console.log("\n✅ Then check Lead Dashboard at: http://localhost:3000/dashboard/lead");
  console.log("═══════════════════════════════════════════════════════════\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

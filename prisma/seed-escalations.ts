import { prisma } from "@/lib/prisma";

async function main() {
  console.log("🌱 Inserting escalation test tickets...\n");

  // Get existing client and users
  const client = await prisma.client.findFirst({ where: { name: "Colgate Palmolive" } });
  const lead = await prisma.user.findFirst({ where: { role: "THREESC_LEAD" } });
  const ravi = await prisma.user.findFirst({ where: { email: { contains: "ravi" } } });
  const sneha = await prisma.user.findFirst({ where: { email: { contains: "sneha" } } });

  // Get projects
  const ppProject = await prisma.project.findFirst({ where: { name: "Production Planning" } });
  const rpProject = await prisma.project.findFirst({ where: { name: "Replenishment Planning" } });
  const rmpProject = await prisma.project.findFirst({ where: { name: "Raw Material Planning" } });

  if (!client || !lead || !ppProject || !rpProject || !rmpProject) {
    console.error("❌ Missing required data. Ensure these projects exist:");
    console.error("   - Production Planning");
    console.error("   - Replenishment Planning");
    console.error("   - Raw Material Planning");
    process.exit(1);
  }

  // RULE 1: CRITICAL Unassigned 30+ min
  await prisma.issue.upsert({
    where: { ticketKey: "PP-2001" },
    update: {},
    create: {
      ticketKey: "PP-2001",
      title: "Production server down - all users affected",
      description: "All production services unreachable. Critical impact.",
      priority: "CRITICAL",
      status: "OPEN",
      category: "ACCESS_SECURITY",
      clientId: client.id,
      projectId: ppProject.id,
      raisedById: lead.id,
      createdAt: new Date(Date.now() - 31 * 60 * 1000),
      updatedAt: new Date(Date.now() - 31 * 60 * 1000),
      escalated: false,
    },
  });
  console.log("✅ PP-2001 - CRITICAL Unassigned 30+ min");

  // RULE 2: HIGH Unassigned 2+ hours
  await prisma.issue.upsert({
    where: { ticketKey: "PP-2002" },
    update: {},
    create: {
      ticketKey: "PP-2002",
      title: "API response time degraded by 50%",
      description: "API endpoints taking 5+ seconds. Performance issue.",
      priority: "HIGH",
      status: "OPEN",
      category: "PERFORMANCE",
      clientId: client.id,
      projectId: ppProject.id,
      raisedById: lead.id,
      createdAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000),
      escalated: false,
    },
  });
  console.log("✅ PP-2002 - HIGH Unassigned 2+ hours");

  // RULE 3: SLA Breached
  await prisma.issue.upsert({
    where: { ticketKey: "PP-2003" },
    update: {},
    create: {
      ticketKey: "PP-2003",
      title: "Customer payment processing failed",
      description: "Stripe integration error. Orders stuck.",
      priority: "CRITICAL",
      status: "IN_PROGRESS",
      category: "BUG",
      clientId: client.id,
      projectId: ppProject.id,
      raisedById: lead.id,
      assignedToId: ravi?.id,
      slaDueAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      slaBreached: true,
      slaBreachRisk: true,
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      escalated: false,
    },
  });
  console.log("✅ PP-2003 - SLA Breached");

  // RULE 4: Stuck IN_PROGRESS 48+ hours
  await prisma.issue.upsert({
    where: { ticketKey: "PP-2004" },
    update: {},
    create: {
      ticketKey: "PP-2004",
      title: "Database migration blocked",
      description: "Migration started 2 days ago. No progress.",
      priority: "HIGH",
      status: "IN_PROGRESS",
      category: "ACCESS_SECURITY",
      clientId: client.id,
      projectId: ppProject.id,
      raisedById: lead.id,
      assignedToId: sneha?.id,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 49 * 60 * 60 * 1000),
      escalated: false,
    },
  });
  console.log("✅ PP-2004 - Stuck IN_PROGRESS 48+ hours");

  // RULE 5: Systemic Pattern (3+ same category)
  await prisma.issue.upsert({
    where: { ticketKey: "PP-2005" },
    update: {},
    create: {
      ticketKey: "PP-2005",
      title: "Batch calculation rounding error - Order #001",
      description: "Rounding error causing material shortage.",
      priority: "HIGH",
      status: "OPEN",
      category: "BUG",
      clientId: client.id,
      projectId: ppProject.id,
      raisedById: lead.id,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      escalated: false,
    },
  });
  console.log("✅ PP-2005 - Systemic Pattern (1/3)");

  await prisma.issue.upsert({
    where: { ticketKey: "PP-2006" },
    update: {},
    create: {
      ticketKey: "PP-2006",
      title: "Batch calculation giving wrong totals - Order #002",
      description: "Same rounding issue. Systemic problem.",
      priority: "HIGH",
      status: "OPEN",
      category: "BUG",
      clientId: client.id,
      projectId: ppProject.id,
      raisedById: lead.id,
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      escalated: false,
    },
  });
  console.log("✅ PP-2006 - Systemic Pattern (2/3)");

  await prisma.issue.upsert({
    where: { ticketKey: "PP-2007" },
    update: {},
    create: {
      ticketKey: "PP-2007",
      title: "Material shortage due to incorrect batch qty",
      description: "Third occurrence. Production line halted.",
      priority: "HIGH",
      status: "OPEN",
      category: "BUG",
      clientId: client.id,
      projectId: ppProject.id,
      raisedById: lead.id,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      escalated: false,
    },
  });
  console.log("✅ PP-2007 - Systemic Pattern (3/3)\n");

  // RP PROJECT TICKETS
  console.log("📝 RP Project Tickets (Replenishment Planning)\n");

  // RP Rule 1: CRITICAL Unassigned
  await prisma.issue.upsert({
    where: { ticketKey: "RP-2001" },
    update: {},
    create: {
      ticketKey: "RP-2001",
      title: "Safety stock calculation not working",
      description: "Safety stock levels showing zero. Critical for inventory management.",
      priority: "CRITICAL",
      status: "OPEN",
      category: "BUG",
      clientId: client.id,
      projectId: rpProject.id,
      raisedById: lead.id,
      createdAt: new Date(Date.now() - 31 * 60 * 1000),
      updatedAt: new Date(Date.now() - 31 * 60 * 1000),
      escalated: false,
    },
  });
  console.log("✅ RP-2001 - CRITICAL Unassigned 30+ min");

  // RP Rule 3: SLA Breached
  await prisma.issue.upsert({
    where: { ticketKey: "RP-2002" },
    update: {},
    create: {
      ticketKey: "RP-2002",
      title: "Reorder point optimization failing",
      description: "Reorder calculation algorithm broken. Causing stock outs.",
      priority: "CRITICAL",
      status: "IN_PROGRESS",
      category: "PERFORMANCE",
      clientId: client.id,
      projectId: rpProject.id,
      raisedById: lead.id,
      assignedToId: ravi?.id,
      slaDueAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      slaBreached: true,
      slaBreachRisk: true,
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      escalated: false,
    },
  });
  console.log("✅ RP-2002 - SLA Breached\n");

  // RMP PROJECT TICKETS
  console.log("📝 RMP Project Tickets (Raw Material Planning)\n");

  // RMP Rule 1: CRITICAL Unassigned
  await prisma.issue.upsert({
    where: { ticketKey: "RMP-2001" },
    update: {},
    create: {
      ticketKey: "RMP-2001",
      title: "Resource allocation algorithm crashed",
      description: "Resource allocation system down. Cannot assign resources to tasks.",
      priority: "CRITICAL",
      status: "OPEN",
      category: "ACCESS_SECURITY",
      clientId: client.id,
      projectId: rmpProject.id,
      raisedById: lead.id,
      createdAt: new Date(Date.now() - 35 * 60 * 1000),
      updatedAt: new Date(Date.now() - 35 * 60 * 1000),
      escalated: false,
    },
  });
  console.log("✅ RMP-2001 - CRITICAL Unassigned 30+ min");

  // RMP Rule 2: HIGH Unassigned
  await prisma.issue.upsert({
    where: { ticketKey: "RMP-2002" },
    update: {},
    create: {
      ticketKey: "RMP-2002",
      title: "Milestone tracking shows wrong dates",
      description: "Milestone dates incorrectly calculated. Timeline reports inaccurate.",
      priority: "HIGH",
      status: "OPEN",
      category: "DATA_ACCURACY",
      clientId: client.id,
      projectId: rmpProject.id,
      raisedById: lead.id,
      createdAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000),
      escalated: false,
    },
  });
  console.log("✅ RMP-2002 - HIGH Unassigned 2+ hours");

  // RMP Rule 4: Stuck IN_PROGRESS
  await prisma.issue.upsert({
    where: { ticketKey: "RMP-2003" },
    update: {},
    create: {
      ticketKey: "RMP-2003",
      title: "Resource planning export feature blocked",
      description: "Export to Excel feature broken. Stuck for 2 days. Users need reports.",
      priority: "HIGH",
      status: "IN_PROGRESS",
      category: "FEATURE_REQUEST",
      clientId: client.id,
      projectId: rmpProject.id,
      raisedById: lead.id,
      assignedToId: sneha?.id,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 49 * 60 * 60 * 1000),
      escalated: false,
    },
  });
  console.log("✅ RMP-2003 - Stuck IN_PROGRESS 48+ hours");

  // RMP Rule 5: Systemic Pattern
  await prisma.issue.upsert({
    where: { ticketKey: "RMP-2004" },
    update: {},
    create: {
      ticketKey: "RMP-2004",
      title: "Resource capacity report shows incorrect numbers - Team A",
      description: "Capacity calculation wrong. Multiple teams affected.",
      priority: "HIGH",
      status: "OPEN",
      category: "BUG",
      clientId: client.id,
      projectId: rmpProject.id,
      raisedById: lead.id,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      escalated: false,
    },
  });

  await prisma.issue.upsert({
    where: { ticketKey: "RMP-2005" },
    update: {},
    create: {
      ticketKey: "RMP-2005",
      title: "Resource capacity report shows incorrect numbers - Team B",
      description: "Same capacity calculation issue in another team.",
      priority: "HIGH",
      status: "OPEN",
      category: "BUG",
      clientId: client.id,
      projectId: rmpProject.id,
      raisedById: lead.id,
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      escalated: false,
    },
  });

  await prisma.issue.upsert({
    where: { ticketKey: "RMP-2006" },
    update: {},
    create: {
      ticketKey: "RMP-2006",
      title: "Resource capacity report shows incorrect numbers - Team C",
      description: "Recurring issue. Systemic problem in capacity engine.",
      priority: "HIGH",
      status: "OPEN",
      category: "BUG",
      clientId: client.id,
      projectId: rmpProject.id,
      raisedById: lead.id,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      escalated: false,
    },
  });

  console.log("✅ RMP-2004 - Systemic Pattern (1/3)");
  console.log("✅ RMP-2005 - Systemic Pattern (2/3)");
  console.log("✅ RMP-2006 - Systemic Pattern (3/3)\n");

  console.log("═════════════════════════════════════════");
  console.log("✅ 13 escalation test tickets inserted!\n");
  console.log("\n📋 PP Project: PP-2001 to PP-2007");
  console.log("📋 RP Project: RP-2001 to RP-2002");
  console.log("📋 RMP Project: RMP-2001 to RMP-2006\n");
  console.log("Now run escalations cron:");
  console.log("curl -X GET http://localhost:3000/api/cron/escalate \\");
  console.log('  -H "Authorization: Bearer xK9mP2jL8vQ5nR3bW6tY7uZ4cS1dE2fG3hJ4kL5mN6oP7qR8sT9uV0wX1yZ2aB3c"\n');
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { prisma } from "@/lib/prisma";
import { generateTicketKey } from "@/lib/ticket-key";

async function createResolvedTickets() {
  console.log("✅ Creating 25 resolved tickets for both clients (with resolution threads)...\n");

  // Get both clients
  const colgate = await prisma.client.findFirst({
    where: { name: "Colgate Palmolive" },
  });
  const modenik = await prisma.client.findFirst({
    where: { name: "Modenik" },
  });

  if (!colgate || !modenik) {
    console.error("One or both clients not found");
    return;
  }

  // Get projects for both
  const colgateProjects = await prisma.project.findMany({
    where: { clientId: colgate.id },
  });
  const modenikProjects = await prisma.project.findMany({
    where: { clientId: modenik.id },
  });

  if (colgateProjects.length === 0 || modenikProjects.length === 0) {
    console.error("Projects not found for one or both clients");
    return;
  }

  // Get users
  const agents = await prisma.user.findMany({
    where: { role: { in: ["THREESC_AGENT", "THREESC_LEAD"] } },
  });

  const colgateUser = await prisma.user.findFirst({
    where: {
      role: "CLIENT_USER",
      clientMembers: { some: { clientId: colgate.id } },
    },
  });

  const modenikUser = await prisma.user.findFirst({
    where: {
      role: "CLIENT_USER",
      clientMembers: { some: { clientId: modenik.id } },
    },
  });

  if (!colgateUser || !modenikUser || agents.length === 0) {
    console.error("Missing users");
    return;
  }

  const now = new Date();
  let created = 0;

  // COLGATE RESOLVED TICKETS (13)
  console.log("📦 Creating 13 resolved tickets for Colgate Palmolive...\n");

  const colgateTickets = [
    { title: "Inventory calculation error in Q2 forecast", category: "BUG", priority: "HIGH" },
    { title: "ROP algorithm not accounting for lead time variability", category: "BUG", priority: "HIGH" },
    { title: "Safety stock threshold alerts firing too frequently", category: "BUG", priority: "MEDIUM" },
    { title: "Demand forecast accuracy improved to 92%", category: "FEATURE_REQUEST", priority: "MEDIUM" },
    { title: "API performance degradation on large data exports", category: "BUG", priority: "HIGH" },
    { title: "Supplier performance dashboard implemented", category: "FEATURE_REQUEST", priority: "MEDIUM" },
    { title: "Material consumption tracking now shows shelf-life warnings", category: "FEATURE_REQUEST", priority: "MEDIUM" },
    { title: "Production schedule sync with ERP completed", category: "BUG", priority: "CRITICAL" },
    { title: "Export ROP calculations as PDF - feature released", category: "FEATURE_REQUEST", priority: "LOW" },
    { title: "Seasonal adjustment factors now support per-category targets", category: "FEATURE_REQUEST", priority: "MEDIUM" },
    { title: "Lead time exceptions now automatically tracked", category: "BUG", priority: "MEDIUM" },
    { title: "Forecast accuracy MAPE calculation corrected", category: "BUG", priority: "HIGH" },
    { title: "Currency fluctuation impact calculator added", category: "FEATURE_REQUEST", priority: "MEDIUM" },
  ];

  for (let i = 0; i < colgateTickets.length; i++) {
    const template = colgateTickets[i];
    const createdAt = new Date(now.getTime() - (40 + i * 3) * 24 * 60 * 60 * 1000); // 40-80 days ago
    const resolvedAt = new Date(createdAt.getTime() + (3 + Math.random() * 7) * 24 * 60 * 60 * 1000); // Resolved 3-10 days later
    const closedAt = new Date(resolvedAt.getTime() + 24 * 60 * 60 * 1000); // Closed 1 day after resolve
    const projectId = colgateProjects[i % colgateProjects.length].id;
    const agent = agents[i % agents.length];
    const approver = agents[(i + 1) % agents.length];

    const ticket = await prisma.issue.create({
      data: {
        title: template.title,
        description: `Resolution: ${template.title} has been successfully resolved and tested in production.`,
        category: template.category as any,
        priority: template.priority as any,
        status: "RESOLVED",
        clientId: colgate.id,
        projectId,
        raisedById: colgateUser.id,
        assignedToId: agent.id,
        slaDueAt: new Date(createdAt.getTime() + 24 * 60 * 60 * 1000),
        resolvedAt,
        closedAt,
        createdAt,
        updatedAt: closedAt,
      },
    });

    const ticketKey = await generateTicketKey(projectId);
    await prisma.issue.update({
      where: { id: ticket.id },
      data: { ticketKey },
    });

    // Add resolution thread
    const c1 = await prisma.comment.create({
      data: {
        issueId: ticket.id,
        authorId: agent.id,
        content: `Started investigation on this issue. Analyzing historical data and comparing against baseline metrics.`,
        isInternal: false,
      },
    });

    const c2 = await prisma.comment.create({
      data: {
        issueId: ticket.id,
        authorId: agent.id,
        content: `Root cause identified. The issue was in the calculation layer. I've prepared a fix and will deploy to staging for testing.`,
        isInternal: false,
        parentId: c1.id,
      },
    });

    const c3 = await prisma.comment.create({
      data: {
        issueId: ticket.id,
        authorId: agent.id,
        content: `Fix deployed to staging. All tests passing. Metrics show improvement across the board. Ready for production.`,
        isInternal: false,
        parentId: c2.id,
      },
    });

    await prisma.comment.create({
      data: {
        issueId: ticket.id,
        authorId: approver.id,
        content: `Code review approved. Changes look solid and follow best practices. Approved for production deployment.`,
        isInternal: false,
        parentId: c3.id,
      },
    });

    const c5 = await prisma.comment.create({
      data: {
        issueId: ticket.id,
        authorId: agent.id,
        content: `✅ Fix deployed to production. Monitoring shows everything is working as expected. Issue resolved and closed.`,
        isInternal: false,
        parentId: c3.id,
      },
    });

    console.log(`  ✓ Colgate - ${ticketKey}: ${template.title}`);
    created++;
  }

  // MODENIK RESOLVED TICKETS (12)
  console.log("\n📦 Creating 12 resolved tickets for Modenik...\n");

  const modenikTickets = [
    { title: "Production line bottleneck identified and resolved", category: "BUG", priority: "CRITICAL" },
    { title: "Master schedule optimization improves efficiency by 18%", category: "FEATURE_REQUEST", priority: "HIGH" },
    { title: "Machine downtime tracking now includes maintenance reasons", category: "FEATURE_REQUEST", priority: "MEDIUM" },
    { title: "Batch size optimizer algorithm tuned for cost efficiency", category: "BUG", priority: "HIGH" },
    { title: "Real-time machine status notifications implemented", category: "FEATURE_REQUEST", priority: "HIGH" },
    { title: "Gantt chart rendering performance improved 5x", category: "BUG", priority: "HIGH" },
    { title: "Preventive maintenance scheduling feature released", category: "FEATURE_REQUEST", priority: "MEDIUM" },
    { title: "Cross-training recommendations now integrated in dashboard", category: "FEATURE_REQUEST", priority: "MEDIUM" },
    { title: "OEE calculation now accounts for all downtime types", category: "BUG", priority: "MEDIUM" },
    { title: "WIP limit alerts working for all production lines", category: "FEATURE_REQUEST", priority: "MEDIUM" },
    { title: "Schedule optimization now runs in <2 minutes", category: "BUG", priority: "HIGH" },
    { title: "Constraint-based scheduling rules fully implemented", category: "FEATURE_REQUEST", priority: "MEDIUM" },
  ];

  for (let i = 0; i < modenikTickets.length; i++) {
    const template = modenikTickets[i];
    const createdAt = new Date(now.getTime() - (45 + i * 3) * 24 * 60 * 60 * 1000); // 45-80 days ago
    const resolvedAt = new Date(createdAt.getTime() + (2 + Math.random() * 8) * 24 * 60 * 60 * 1000); // Resolved 2-10 days later
    const closedAt = new Date(resolvedAt.getTime() + 24 * 60 * 60 * 1000); // Closed 1 day after resolve
    const projectId = modenikProjects[i % modenikProjects.length].id;
    const agent = agents[(i + 2) % agents.length];
    const approver = agents[(i + 3) % agents.length];

    const ticket = await prisma.issue.create({
      data: {
        title: template.title,
        description: `Resolution: ${template.title} has been successfully completed and validated in production.`,
        category: template.category as any,
        priority: template.priority as any,
        status: "RESOLVED",
        clientId: modenik.id,
        projectId,
        raisedById: modenikUser.id,
        assignedToId: agent.id,
        slaDueAt: new Date(createdAt.getTime() + 24 * 60 * 60 * 1000),
        resolvedAt,
        closedAt,
        createdAt,
        updatedAt: closedAt,
      },
    });

    const ticketKey = await generateTicketKey(projectId);
    await prisma.issue.update({
      where: { id: ticket.id },
      data: { ticketKey },
    });

    // Add resolution thread
    const c1 = await prisma.comment.create({
      data: {
        issueId: ticket.id,
        authorId: agent.id,
        content: `Began work on this issue. Reviewing current implementation and identifying optimization opportunities.`,
        isInternal: false,
      },
    });

    const c2 = await prisma.comment.create({
      data: {
        issueId: ticket.id,
        authorId: agent.id,
        content: `Solution designed and code implementation started. Tested locally with positive results showing significant improvements.`,
        isInternal: false,
        parentId: c1.id,
      },
    });

    const c3 = await prisma.comment.create({
      data: {
        issueId: ticket.id,
        authorId: agent.id,
        content: `Implementation complete and staging tests passed. Performance benchmarks show expected improvement. Ready for code review.`,
        isInternal: false,
        parentId: c2.id,
      },
    });

    await prisma.comment.create({
      data: {
        issueId: ticket.id,
        authorId: approver.id,
        content: `Reviewed code and implementation. Excellent work! This is approved for production release.`,
        isInternal: false,
        parentId: c3.id,
      },
    });

    const c5 = await prisma.comment.create({
      data: {
        issueId: ticket.id,
        authorId: agent.id,
        content: `✅ Successfully deployed to production. All systems monitoring normally. Issue resolved.`,
        isInternal: false,
        parentId: c3.id,
      },
    });

    console.log(`  ✓ Modenik - ${ticketKey}: ${template.title}`);
    created++;
  }

  console.log(`\n✅ Created ${created} resolved tickets (13 Colgate + 12 Modenik)!`);
  console.log(`\nAll resolved tickets include:`);
  console.log(`  • Investigation and diagnosis comments`);
  console.log(`  • Solution implementation details`);
  console.log(`  • Code review approval`);
  console.log(`  • Production deployment confirmation`);
  console.log(`  • Proper resolvedAt and closedAt timestamps`);
}

createResolvedTickets()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

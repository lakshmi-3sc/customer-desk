import { prisma } from "@/lib/prisma";
import { generateTicketKey } from "@/lib/ticket-key";

async function createAlertTickets() {
  console.log("⚠️  Creating ~25 tickets that match admin dashboard alert criteria...\n");

  // Get Colgate
  const colgate = await prisma.client.findFirst({
    where: { name: "Colgate Palmolive" },
  });

  if (!colgate) {
    console.error("Colgate Palmolive not found");
    return;
  }

  // Get projects
  const projects = await prisma.project.findMany({
    where: { clientId: colgate.id },
  });

  if (projects.length === 0) {
    console.error("No projects found");
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

  if (!colgateUser || agents.length === 0) {
    console.error("Missing users");
    return;
  }

  const now = new Date();
  let created = 0;

  // === 1. SLA BREACHED TICKETS (5) ===
  // These have slaBreached = true and slaDueAt in the past
  console.log("📛 Creating SLA Breached tickets (5)...");
  for (let i = 0; i < 5; i++) {
    const createdAt = new Date(now.getTime() - (10 + i * 2) * 24 * 60 * 60 * 1000); // 10-18 days ago
    const slaDueAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000); // Due 1 day after creation
    const projectId = projects[i % projects.length].id;

    const ticket = await prisma.issue.create({
      data: {
        title: `SLA Breached: ${["Customer awaiting resolution", "Escalation not handled", "Payment processing issue", "Service outage", "Data integrity error"][i]}`,
        description: `This critical issue has breached its SLA. Resolution was expected but has not been completed. Immediate escalation required.`,
        category: "BUG",
        priority: "CRITICAL",
        status: "OPEN",
        clientId: colgate.id,
        projectId,
        raisedById: colgateUser.id,
        assignedToId: agents[i % agents.length].id,
        slaBreached: true, // Explicitly set breached
        slaDueAt,
        createdAt,
        updatedAt: createdAt,
      },
    });

    const ticketKey = await generateTicketKey(projectId);
    await prisma.issue.update({
      where: { id: ticket.id },
      data: { ticketKey },
    });

    console.log(`  ✓ SLA Breached: ${ticketKey}`);
    created++;
  }

  // === 2. SLA AT RISK - WITHIN 2 HOURS (6) ===
  // slaDueAt between now and now + 2 hours, slaBreached = false
  console.log("⏰ Creating SLA at Risk tickets (6)...");
  for (let i = 0; i < 6; i++) {
    const createdAt = new Date(now.getTime() - (4 + i) * 60 * 60 * 1000); // 4-9 hours ago
    const slaDueAt = new Date(now.getTime() + (30 + i * 10) * 60 * 1000); // 30-90 minutes from now
    const projectId = projects[i % projects.length].id;

    const ticket = await prisma.issue.create({
      data: {
        title: `SLA At Risk: ${["Forecast accuracy degraded", "Inventory count mismatch", "Schedule conflict detected", "Supplier quality issue", "Production delay warning", "Material ordering delay"][i]}`,
        description: `This ticket is approaching its SLA deadline. Immediate action required to prevent breach.`,
        category: "BUG",
        priority: "HIGH",
        status: "IN_PROGRESS",
        clientId: colgate.id,
        projectId,
        raisedById: colgateUser.id,
        assignedToId: agents[i % agents.length].id,
        slaBreached: false,
        slaDueAt,
        createdAt,
        updatedAt: new Date(now.getTime() - 30 * 60 * 1000), // Updated 30 min ago
      },
    });

    const ticketKey = await generateTicketKey(projectId);
    await prisma.issue.update({
      where: { id: ticket.id },
      data: { ticketKey },
    });

    console.log(`  ✓ SLA at Risk: ${ticketKey} (due in ~${30 + i * 10} mins)`);
    created++;
  }

  // === 3. CRITICAL + SLA AT RISK (4) ===
  // Critical priority + within 2 hours
  console.log("🔴 Creating Critical + SLA at Risk tickets (4)...");
  for (let i = 0; i < 4; i++) {
    const createdAt = new Date(now.getTime() - (2 + i * 1.5) * 60 * 60 * 1000); // 2-6 hours ago
    const slaDueAt = new Date(now.getTime() + (15 + i * 5) * 60 * 1000); // 15-35 minutes from now
    const projectId = projects[i % projects.length].id;

    const ticket = await prisma.issue.create({
      data: {
        title: `CRITICAL - SLA at Risk: ${["Complete system downtime", "Database corruption", "API rate limit exceeded", "Production line halt"][i]}`,
        description: `CRITICAL priority ticket approaching SLA breach. This requires immediate executive attention and escalation.`,
        category: "BUG",
        priority: "CRITICAL",
        status: "ACKNOWLEDGED",
        clientId: colgate.id,
        projectId,
        raisedById: colgateUser.id,
        assignedToId: agents[i % agents.length].id,
        slaBreached: false,
        slaDueAt,
        createdAt,
        updatedAt: new Date(now.getTime() - 10 * 60 * 1000), // Updated 10 min ago
      },
    });

    const ticketKey = await generateTicketKey(projectId);
    await prisma.issue.update({
      where: { id: ticket.id },
      data: { ticketKey },
    });

    console.log(`  ✓ Critical + SLA at Risk: ${ticketKey} (due in ~${15 + i * 5} mins)`);
    created++;
  }

  // === 4. UNASSIGNED > 4 HOURS (5) ===
  // assignedToId = null, createdAt <= now - 4 hours
  console.log("👤 Creating Unassigned >4h tickets (5)...");
  for (let i = 0; i < 5; i++) {
    const hoursAgo = 5 + i; // 5-9 hours ago
    const createdAt = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
    const projectId = projects[i % projects.length].id;

    const ticket = await prisma.issue.create({
      data: {
        title: `Unassigned: ${["Reorder point optimization question", "Safety stock calculation help", "Demand forecast adjustment", "Production schedule review", "Supplier performance query"][i]}`,
        description: `This ticket has been waiting for assignment for over 4 hours. Please review and assign to appropriate agent.`,
        category: "FEATURE_REQUEST",
        priority: ["CRITICAL", "HIGH", "MEDIUM", "MEDIUM", "LOW"][i] as any,
        status: "OPEN",
        clientId: colgate.id,
        projectId,
        raisedById: colgateUser.id,
        assignedToId: null, // UNASSIGNED
        slaDueAt: new Date(createdAt.getTime() + 24 * 60 * 60 * 1000),
        createdAt,
        updatedAt: createdAt,
      },
    });

    const ticketKey = await generateTicketKey(projectId);
    await prisma.issue.update({
      where: { id: ticket.id },
      data: { ticketKey },
    });

    console.log(`  ✓ Unassigned >4h: ${ticketKey} (${hoursAgo}h pending assignment)`);
    created++;
  }

  // === 5. UNRESPONDED > 24 HOURS (5) ===
  // status = OPEN, createdAt <= now - 24 hours, NO public comments
  console.log("📭 Creating Unresponded >24h tickets (5)...");
  for (let i = 0; i < 5; i++) {
    const daysAgo = 2 + i; // 2-6 days ago
    const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const projectId = projects[i % projects.length].id;

    const ticket = await prisma.issue.create({
      data: {
        title: `No Response: ${["Waiting for customer feedback on proposal", "Clarification needed on requirements", "Approval pending for changes", "Awaiting customer test results", "Pending budget confirmation"][i]}`,
        description: `Customer response required to proceed. This ticket has been awaiting customer input for over 24 hours.`,
        category: "FEATURE_REQUEST",
        priority: "MEDIUM",
        status: "OPEN", // Must be OPEN for alert
        clientId: colgate.id,
        projectId,
        raisedById: colgateUser.id,
        assignedToId: agents[i % agents.length].id,
        slaDueAt: new Date(createdAt.getTime() + 72 * 60 * 60 * 1000),
        createdAt,
        updatedAt: createdAt,
      },
    });

    const ticketKey = await generateTicketKey(projectId);
    await prisma.issue.update({
      where: { id: ticket.id },
      data: { ticketKey },
    });

    // Add INTERNAL comments so it still has no PUBLIC response
    await prisma.comment.create({
      data: {
        issueId: ticket.id,
        authorId: agents[0].id,
        content: `[Internal Note] Awaiting customer response. Sent reminder email.`,
        isInternal: true, // INTERNAL - doesn't count as "responded"
      },
    });

    console.log(`  ✓ Unresponded >24h: ${ticketKey} (${daysAgo}d with no public response)`);
    created++;
  }

  console.log(`\n✅ Created ${created} alert-matching tickets!`);
  console.log(`\nAlert criteria summary:`);
  console.log(`  • SLA Breached (5): slaBreached = true`);
  console.log(`  • SLA at Risk (6): slaDueAt within 2 hours from now`);
  console.log(`  • Critical + SLA at Risk (4): CRITICAL priority + within 2h`);
  console.log(`  • Unassigned >4h (5): assignedToId = null + created >4h ago`);
  console.log(`  • Unresponded >24h (5): OPEN status + created >24h ago + no public comments`);
}

createAlertTickets()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

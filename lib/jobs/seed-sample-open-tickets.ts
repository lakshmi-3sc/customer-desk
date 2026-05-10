import { prisma } from "@/lib/prisma";
import { generateTicketKey } from "@/lib/ticket-key";
import { calculateSLADeadline } from "@/lib/sla";

/**
 * Creates realistic OPEN/IN_PROGRESS tickets for UI demo
 * Related to existing KB articles and resolved tickets
 * Colgate: Replenishment Planning, Production Planning, Raw Material Planning
 * Modenik: General support tickets
 */
async function seedSampleOpenTickets() {
  try {
    console.log("🎫 Creating sample OPEN tickets for UI...");

    // Get projects
    const colgateReplPlan = await prisma.project.findFirst({
      where: { name: { contains: "Replenishment" } },
    });
    const colgateProdPlan = await prisma.project.findFirst({
      where: { name: { contains: "Production" } },
    });
    const colgateRawMat = await prisma.project.findFirst({
      where: { name: { contains: "Raw Material" } },
    });
    const modenik = await prisma.project.findFirst({
      where: { clientId: { not: colgateReplPlan?.clientId } },
    });

    // Get users
    const clientUser = await prisma.user.findFirst({
      where: { role: "CLIENT_USER" },
    });
    const agent1 = await prisma.user.findFirst({
      where: { role: "THREESC_AGENT" },
    });
    const agent2 = await prisma.user.findAll({
      where: { role: "THREESC_AGENT" },
      take: 2,
    });

    if (!colgateReplPlan || !colgateProdPlan || !colgateRawMat || !modenik || !clientUser || !agent1) {
      console.error("❌ Missing required projects or users");
      return;
    }

    const tickets = [
      // Replenishment Planning - OPEN
      {
        title: "SKU ABC123 forecast not updating for next quarter",
        description:
          "The demand forecast for SKU ABC123 shows 2024 data but we need 2025 Q1 forecast. The forecast refresh seems to be stuck on old data.",
        projectId: colgateReplPlan.id,
        status: "OPEN" as const,
        priority: "HIGH",
        category: "BUG" as const,
      },
      {
        title: "Replenishment schedule shows incorrect stock levels",
        description:
          "After warehouse count, our system still shows old stock levels. Manual count shows 500 units but system shows 1200. This is blocking purchase decisions.",
        projectId: colgateReplPlan.id,
        status: "OPEN" as const,
        priority: "CRITICAL",
        category: "DATA_ACCURACY" as const,
      },
      {
        title: "Cannot generate monthly replenishment report",
        description: "Export to CSV is failing for April. Tried 3 times, getting timeout error. Need this report for management review.",
        projectId: colgateReplPlan.id,
        status: "IN_PROGRESS" as const,
        priority: "MEDIUM",
        category: "BUG" as const,
      },

      // Production Planning - OPEN
      {
        title: "Line A batch job running very slow",
        description:
          "Daily production plan generation for Line A is taking 45+ minutes. Should be 5 minutes. Started last week without any configuration changes.",
        projectId: colgateProdPlan.id,
        status: "OPEN" as const,
        priority: "HIGH",
        category: "PERFORMANCE" as const,
      },
      {
        title: "Production schedule conflicts not detected",
        description:
          "Two shifts are assigned to Line B at same time. System should have flagged this but didn't. Need conflict detection working before Monday.",
        projectId: colgateProdPlan.id,
        status: "OPEN" as const,
        priority: "CRITICAL",
        category: "BUG" as const,
      },
      {
        title: "Machine downtime not reflected in plan",
        description:
          "Line C is down for maintenance but production plan still shows it as available. Need to mark equipment unavailable for 3 days.",
        projectId: colgateProdPlan.id,
        status: "IN_PROGRESS" as const,
        priority: "HIGH",
        category: "BUG" as const,
      },

      // Raw Material Planning - OPEN
      {
        title: "Cannot add new supplier to system",
        description:
          "New supplier registered but form submission fails. Need to add them for raw material sourcing ASAP as we're running low on Material-X.",
        projectId: colgateRawMat.id,
        status: "OPEN" as const,
        priority: "CRITICAL",
        category: "BUG" as const,
      },
      {
        title: "Lead time calculations way off",
        description:
          "System showing 20-day lead time for standard supplier, should be 7 days. Affecting purchase order timing and cost.",
        projectId: colgateRawMat.id,
        status: "OPEN" as const,
        priority: "HIGH",
        category: "DATA_ACCURACY" as const,
      },
      {
        title: "API integration with supplier slow",
        description:
          "Real-time inventory sync is delayed by 6+ hours. Used to be instant. Supplier API seems responsive, need to check our connector.",
        projectId: colgateRawMat.id,
        status: "IN_PROGRESS" as const,
        priority: "MEDIUM",
        category: "PERFORMANCE" as const,
      },

      // Modenik - OPEN
      {
        title: "User profile page crashes on load",
        description:
          "Getting 500 error when clicking profile. Happens on Chrome and Firefox. Account details needed for today's meeting.",
        projectId: modenik.id,
        status: "OPEN" as const,
        priority: "CRITICAL",
        category: "BUG" as const,
      },
      {
        title: "Search feature not working",
        description: "Search bar returns no results even for existing items. Worked yesterday. No database changes that we know of.",
        projectId: modenik.id,
        status: "OPEN" as const,
        priority: "HIGH",
        category: "BUG" as const,
      },
      {
        title: "Dashboard loading takes 20+ seconds",
        description:
          "Dashboard used to load in 2 seconds, now takes 20+. Database queries seem slow. Need performance review.",
        projectId: modenik.id,
        status: "IN_PROGRESS" as const,
        priority: "MEDIUM",
        category: "PERFORMANCE" as const,
      },
    ];

    for (const ticketData of tickets) {
      const ticketKey = await generateTicketKey(ticketData.projectId);
      const assignedAgent = Math.random() > 0.3 ? agent1 : agent2[0];

      const ticket = await prisma.issue.create({
        data: {
          title: ticketData.title,
          description: ticketData.description,
          category: ticketData.category,
          priority: ticketData.priority as any,
          status: ticketData.status,
          raisedById: clientUser.id,
          assignedToId: ticketData.status === "OPEN" ? undefined : assignedAgent?.id,
          projectId: ticketData.projectId,
          clientId:
            ticketData.projectId === modenik.id
              ? modenik.clientId
              : colgateReplPlan.clientId,
          ticketKey,
          createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      });

      // Calculate SLA deadline
      await calculateSLADeadline(ticket.id);

      console.log(
        `✅ ${ticketKey}: ${ticketData.title.substring(0, 50)}... [${ticketData.status}]`
      );
    }

    console.log(`\n✨ Created ${tickets.length} sample tickets!`);
  } catch (error) {
    console.error("❌ Error seeding tickets:", error);
    throw error;
  }
}

seedSampleOpenTickets()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

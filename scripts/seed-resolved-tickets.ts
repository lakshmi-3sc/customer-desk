import { prisma } from "@/lib/prisma";

async function seedResolvedTickets() {
  try {
    // Get a client and user for the tickets
    const client = await prisma.client.findFirst();
    const user = await prisma.user.findFirst();
    const project = await prisma.project.findFirst();

    if (!client || !user || !project) {
      console.error("Required client, user, or project not found");
      process.exit(1);
    }

    // Sample resolved tickets related to RP, PP, RMP
    const tickets = [
      {
        title: "Production planning schedule conflict resolved",
        description:
          "We had overlapping production runs scheduled. Adjusted the production planning timeline to avoid conflicts and improved throughput by 15%.",
        category: "PERFORMANCE" as const,
        priority: "HIGH" as const,
        status: "RESOLVED" as const,
        clientId: client.id,
        projectId: project.id,
        raisedById: user.id,
        resolvedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      },
      {
        title: "Raw material planning accuracy improved",
        description:
          "Implemented demand forecasting integration with supplier API. Raw material planning now has 92% accuracy in inventory predictions.",
        category: "DATA_ACCURACY" as const,
        priority: "MEDIUM" as const,
        status: "RESOLVED" as const,
        clientId: client.id,
        projectId: project.id,
        raisedById: user.id,
        resolvedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
      },
      {
        title: "Replenishment planning lead time reduced",
        description:
          "Optimized replenishment cycle by 3 days using predictive analytics. Suppliers now get 7-day notice instead of 10-day, reducing holding costs.",
        category: "FEATURE_REQUEST" as const,
        priority: "HIGH" as const,
        status: "RESOLVED" as const,
        clientId: client.id,
        projectId: project.id,
        raisedById: user.id,
        resolvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      },
      {
        title: "Production planning capacity exceeded - resolved",
        description:
          "Scheduled maintenance was blocking production planning. Rescheduled maintenance to off-peak hours. Capacity is now at 88% utilization.",
        category: "PERFORMANCE" as const,
        priority: "CRITICAL" as const,
        status: "RESOLVED" as const,
        clientId: client.id,
        projectId: project.id,
        raisedById: user.id,
        resolvedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      },
      {
        title: "Raw material supplier integration complete",
        description:
          "Connected 5 key suppliers for automated raw material planning. Integration reduced manual data entry by 80% and improved order accuracy.",
        category: "FEATURE_REQUEST" as const,
        priority: "MEDIUM" as const,
        status: "RESOLVED" as const,
        clientId: client.id,
        projectId: project.id,
        raisedById: user.id,
        resolvedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000), // 21 days ago
      },
      {
        title: "Replenishment safety stock optimized",
        description:
          "Analyzed 6 months of demand patterns. Reduced safety stock by 25% while maintaining 99.2% fulfillment rate for replenishment orders.",
        category: "PERFORMANCE" as const,
        priority: "MEDIUM" as const,
        status: "RESOLVED" as const,
        clientId: client.id,
        projectId: project.id,
        raisedById: user.id,
        resolvedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      },
      {
        title: "Production planning bottleneck identified and fixed",
        description:
          "Assembly line was the constraint in production planning. Added 2 parallel workstations. Throughput increased by 40%.",
        category: "BUG" as const,
        priority: "CRITICAL" as const,
        status: "RESOLVED" as const,
        clientId: client.id,
        projectId: project.id,
        raisedById: user.id,
        resolvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
      {
        title: "Raw material forecasting model updated",
        description:
          "Upgraded raw material planning forecasting algorithm from moving average to exponential smoothing with trend adjustment. Accuracy improved from 78% to 91%.",
        category: "DATA_ACCURACY" as const,
        priority: "MEDIUM" as const,
        status: "RESOLVED" as const,
        clientId: client.id,
        projectId: project.id,
        raisedById: user.id,
        resolvedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
      },
    ];

    // Create tickets
    let created = 0;
    for (const ticket of tickets) {
      try {
        await prisma.issue.create({
          data: ticket,
        });
        created++;
        console.log(`✓ Created: ${ticket.title}`);
      } catch (e) {
        console.error(`✗ Failed to create: ${ticket.title}`, (e as Error).message);
      }
    }

    console.log(
      `\n✓ Seeded ${created}/${tickets.length} resolved tickets related to RP, PP, RMP`
    );
    process.exit(0);
  } catch (error) {
    console.error("Error seeding tickets:", error);
    process.exit(1);
  }
}

seedResolvedTickets();

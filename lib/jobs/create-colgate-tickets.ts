import { prisma } from "@/lib/prisma";
import { generateTicketKey } from "@/lib/ticket-key";

async function createColgateTickets() {
  console.log("🎫 Creating 50 tickets for Colgate Palmolive projects...\n");

  // Get Colgate and their projects
  const colgate = await prisma.client.findFirst({
    where: { name: "Colgate Palmolive" },
  });

  if (!colgate) {
    console.error("Colgate Palmolive client not found");
    return;
  }

  const projects = await prisma.project.findMany({
    where: { clientId: colgate.id },
  });

  if (projects.length === 0) {
    console.error("No projects found for Colgate Palmolive");
    return;
  }

  // Get 3SC users for assignment
  const users = await prisma.user.findMany({
    where: {
      role: { in: ["THREESC_AGENT", "THREESC_LEAD"] },
    },
  });

  if (users.length === 0) {
    console.error("No 3SC team members found");
    return;
  }

  // Get Colgate client user for raising tickets
  const colgateUser = await prisma.user.findFirst({
    where: {
      role: "CLIENT_USER",
      clientMembers: {
        some: { clientId: colgate.id },
      },
    },
  });

  if (!colgateUser) {
    console.error("No Colgate client user found");
    return;
  }

  const ticketTemplates = [
    // REPLENISHMENT PLANNING PROJECT TICKETS
    {
      projectId: projects.find((p) => p.name === "Replenishment Planning")?.id,
      title: "Safety stock calculation not reflecting seasonal peaks",
      description:
        "When we input seasonal demand patterns, the safety stock calculator is not adjusting the output accordingly. Expected a 25% increase for Q4 peak season but the system calculated only 8%.",
      category: "BUG",
      priority: "HIGH",
    },
    {
      projectId: projects.find((p) => p.name === "Replenishment Planning")?.id,
      title: "Reorder point recommendations are outdated",
      description:
        "The ROP calculations seem to be using stale lead time data. Our suppliers updated lead times 2 weeks ago but the system is still using old values, causing overstock situations.",
      category: "BUG",
      priority: "HIGH",
    },
    {
      projectId: projects.find((p) => p.name === "Replenishment Planning")?.id,
      title: "Need bulk upload feature for demand forecasts",
      description:
        "Currently we manually enter demand forecasts for 500+ SKUs one by one. A CSV bulk upload feature would save us 4-5 hours per month.",
      category: "FEATURE_REQUEST",
      priority: "MEDIUM",
    },
    {
      projectId: projects.find((p) => p.name === "Replenishment Planning")?.id,
      title: "Forecast accuracy metrics not loading",
      description:
        "The dashboard shows a blank MAPE chart for the past 3 days. Error message briefly appears then disappears. Affects our weekly review process.",
      category: "BUG",
      priority: "CRITICAL",
    },
    {
      projectId: projects.find((p) => p.name === "Replenishment Planning")?.id,
      title: "API timeout when querying >10000 inventory records",
      description:
        "When we try to export historical inventory data for analytics, the API times out after 30 seconds. We have 18,000 SKU records.",
      category: "BUG",
      priority: "HIGH",
    },
    {
      projectId: projects.find((p) => p.name === "Replenishment Planning")?.id,
      title: "Add supplier performance metrics dashboard",
      description:
        "Would like to see on-time delivery %, defect rates, and lead time consistency for each supplier in a dashboard view.",
      category: "FEATURE_REQUEST",
      priority: "MEDIUM",
    },
    {
      projectId: projects.find((p) => p.name === "Replenishment Planning")?.id,
      title: "Safety stock threshold alert not triggering",
      description:
        "We set up low-stock alerts but only received 2 out of 15 expected alerts this month. Toothpaste SKU almost went out of stock without notification.",
      category: "BUG",
      priority: "CRITICAL",
    },
    {
      projectId: projects.find((p) => p.name === "Replenishment Planning")?.id,
      title: "Demand forecast shows negative values for some products",
      description:
        "After running the forecast algorithm yesterday, three products are showing -450, -200, and -80 units. This is clearly a calculation error.",
      category: "BUG",
      priority: "CRITICAL",
    },
    {
      projectId: projects.find((p) => p.name === "Replenishment Planning")?.id,
      title: "Export ROP recommendations as PDF report",
      description:
        "Currently we can only view ROP calculations on screen. Need ability to export as PDF with timestamp and recommendations for auditing purposes.",
      category: "FEATURE_REQUEST",
      priority: "LOW",
    },
    {
      projectId: projects.find((p) => p.name === "Replenishment Planning")?.id,
      title: "Seasonal adjustment factor input is unclear",
      description:
        "The UI for entering seasonal adjustment factors (1.0-2.0) is not intuitive. Received 5 support calls about proper usage this week.",
      category: "BUG",
      priority: "MEDIUM",
    },
    {
      projectId: projects.find((p) => p.name === "Replenishment Planning")?.id,
      title: "Lead time variability calculation seems wrong",
      description:
        "Standard deviation calculation for lead times doesn't match our manual calculations. Off by ~15% consistently.",
      category: "BUG",
      priority: "HIGH",
    },
    {
      projectId: projects.find((p) => p.name === "Replenishment Planning")?.id,
      title: "Add comparison view for different forecast scenarios",
      description:
        "Want to compare 'optimistic', 'realistic', and 'pessimistic' demand scenarios side-by-side before finalizing forecast.",
      category: "FEATURE_REQUEST",
      priority: "MEDIUM",
    },
    {
      projectId: projects.find((p) => p.name === "Replenishment Planning")?.id,
      title: "Inventory count discrepancies not flagged",
      description:
        "When physical inventory differs from system by >5%, system should highlight as anomaly. Currently shows no warning.",
      category: "FEATURE_REQUEST",
      priority: "HIGH",
    },
    {
      projectId: projects.find((p) => p.name === "Replenishment Planning")?.id,
      title: "Service level targets not editable per category",
      description:
        "Need different service level targets for premium vs budget product lines but system enforces one global target.",
      category: "FEATURE_REQUEST",
      priority: "MEDIUM",
    },
    {
      projectId: projects.find((p) => p.name === "Replenishment Planning")?.id,
      title: "ROP recommendation engine keeps timing out",
      description:
        "Every Friday afternoon when we run weekly ROP recommendations, the job times out. Recovered SKUs: 2400/3200 before failure.",
      category: "BUG",
      priority: "HIGH",
    },
    {
      projectId: projects.find((p) => p.name === "Replenishment Planning")?.id,
      title: "Supplier lead time exceptions not being tracked",
      description:
        "When a supplier delivers late, we manually log it but system doesn't update the statistical lead time. Manual workaround needed.",
      category: "BUG",
      priority: "MEDIUM",
    },
    {
      projectId: projects.find((p) => p.name === "Replenishment Planning")?.id,
      title: "Demand forecast shows no data for new SKUs",
      description:
        "When we add new toothpaste variant SKU, forecast algorithm returns 0 predicted demand instead of interpolating from similar SKUs.",
      category: "BUG",
      priority: "HIGH",
    },

    // PRODUCTION PLANNING PROJECT TICKETS
    {
      projectId: projects.find((p) => p.name === "Production Planning")?.id,
      title: "Master schedule conflicts not highlighted",
      description:
        "System allows scheduling two production runs on the same line for overlapping times. We caught this manually but system should prevent it.",
      category: "BUG",
      priority: "CRITICAL",
    },
    {
      projectId: projects.find((p) => p.name === "Production Planning")?.id,
      title: "Batch size optimizer sometimes recommends uneconomical runs",
      description:
        "For small orders, the system sometimes recommends batch sizes that result in 30% idle machine time. Algorithm needs refinement.",
      category: "BUG",
      priority: "MEDIUM",
    },
    {
      projectId: projects.find((p) => p.name === "Production Planning")?.id,
      title: "Need real-time machine status updates",
      description:
        "Currently checking machine status manually every hour. Would like automated push notifications for breakdowns, maintenance, or completion.",
      category: "FEATURE_REQUEST",
      priority: "HIGH",
    },
    {
      projectId: projects.find((p) => p.name === "Production Planning")?.id,
      title: "Production schedule export missing setup times",
      description:
        "When we export the daily production schedule to PDF, setup times between batches are omitted, confusing operators on the floor.",
      category: "BUG",
      priority: "MEDIUM",
    },
    {
      projectId: projects.find((p) => p.name === "Production Planning")?.id,
      title: "Capacity planning shows incorrect available capacity",
      description:
        "Dashboard reports 40% available capacity but when we tried to schedule new order we hit bottleneck. Calculation seems to ignore constraint machines.",
      category: "BUG",
      priority: "HIGH",
    },
    {
      projectId: projects.find((p) => p.name === "Production Planning")?.id,
      title: "Add preventive maintenance scheduling",
      description:
        "Need to schedule preventive maintenance windows that block production capacity. Currently done manually in separate system.",
      category: "FEATURE_REQUEST",
      priority: "MEDIUM",
    },
    {
      projectId: projects.find((p) => p.name === "Production Planning")?.id,
      title: "Cross-training recommendations missing from dashboard",
      description:
        "System tracks operator skills but doesn't suggest cross-training opportunities when bottlenecks detected. Manual analysis required.",
      category: "FEATURE_REQUEST",
      priority: "LOW",
    },
    {
      projectId: projects.find((p) => p.name === "Production Planning")?.id,
      title: "Schedule changes not syncing with ERP system",
      description:
        "When we update production schedule in this system, ERP material requirements don't update. Causing material shortages on floor.",
      category: "BUG",
      priority: "CRITICAL",
    },
    {
      projectId: projects.find((p) => p.name === "Production Planning")?.id,
      title: "Gantt chart rendering performance degraded",
      description:
        "When viewing 30-day schedule with 500+ production runs, the Gantt chart takes 15+ seconds to load and becomes unresponsive.",
      category: "BUG",
      priority: "HIGH",
    },
    {
      projectId: projects.find((p) => p.name === "Production Planning")?.id,
      title: "Add constraint-based scheduling rules",
      description:
        "Want to specify rules like 'only run Product A on Line 2' or 'never schedule back-to-back batches >6 hours'. Currently no way to enforce.",
      category: "FEATURE_REQUEST",
      priority: "MEDIUM",
    },
    {
      projectId: projects.find((p) => p.name === "Production Planning")?.id,
      title: "Production efficiency metrics not calculating correctly",
      description:
        "OEE calculation shows 92% but manual audit shows 78%. System may be excluding downtime from the baseline.",
      category: "BUG",
      priority: "HIGH",
    },
    {
      projectId: projects.find((p) => p.name === "Production Planning")?.id,
      title: "Buffer time calculation doesn't account for line type",
      description:
        "System adds 15% buffer for all lines but our high-speed packaging line needs only 8% while complex mixing needs 25%.",
      category: "BUG",
      priority: "MEDIUM",
    },
    {
      projectId: projects.find((p) => p.name === "Production Planning")?.id,
      title: "Schedule optimization takes >5 minutes for 100 orders",
      description:
        "When running the optimization algorithm to minimize changeovers for 100 pending orders, it times out. Need faster algorithm.",
      category: "BUG",
      priority: "HIGH",
    },
    {
      projectId: projects.find((p) => p.name === "Production Planning")?.id,
      title: "Add WIP limit alerts by production line",
      description:
        "Want alerts when work-in-progress inventory exceeds targets for each line. Currently no visibility into WIP accumulation.",
      category: "FEATURE_REQUEST",
      priority: "MEDIUM",
    },

    // RAW MATERIAL PLANNING PROJECT TICKETS
    {
      projectId: projects.find((p) => p.name === "Raw Material Planning")?.id,
      title: "Supplier performance tracking incomplete",
      description:
        "On-time delivery metric only counts if delivery is within supplier's quoted lead time, not our required lead time. Showing false positives.",
      category: "BUG",
      priority: "MEDIUM",
    },
    {
      projectId: projects.find((p) => p.name === "Raw Material Planning")?.id,
      title: "Material shortage alerts sent too late",
      description:
        "Alert for critical raw material shortage arrived 2 days after inventory dropped below minimum. Need real-time monitoring.",
      category: "BUG",
      priority: "CRITICAL",
    },
    {
      projectId: projects.find((p) => p.name === "Raw Material Planning")?.id,
      title: "Supplier contract terms not enforcing penalties",
      description:
        "Contract specifies 2% penalty for late deliveries but system doesn't track or flag breaches. Manual audit required.",
      category: "BUG",
      priority: "MEDIUM",
    },
    {
      projectId: projects.find((p) => p.name === "Raw Material Planning")?.id,
      title: "Add supplier alternative recommendation engine",
      description:
        "When primary supplier has quality issues, system should automatically suggest vetted alternative suppliers with price/quality comparison.",
      category: "FEATURE_REQUEST",
      priority: "HIGH",
    },
    {
      projectId: projects.find((p) => p.name === "Raw Material Planning")?.id,
      title: "Currency fluctuation impact not calculated",
      description:
        "For imported raw materials, need to see how exchange rate changes affect total landed cost but system shows only base supplier price.",
      category: "FEATURE_REQUEST",
      priority: "MEDIUM",
    },
    {
      projectId: projects.find((p) => p.name === "Raw Material Planning")?.id,
      title: "Customs clearance delays not factored into lead time",
      description:
        "Imported ingredients often experience 2-5 day customs delays but system uses supplier's promised lead time, not actual door-to-door time.",
      category: "BUG",
      priority: "HIGH",
    },
    {
      projectId: projects.find((p) => p.name === "Raw Material Planning")?.id,
      title: "Material quality inspection reports not linked to POs",
      description:
        "Inspection reports and test results stored separately. System doesn't link quality data back to the PO for traceability.",
      category: "BUG",
      priority: "MEDIUM",
    },
    {
      projectId: projects.find((p) => p.name === "Raw Material Planning")?.id,
      title: "Supplier financial health monitoring missing",
      description:
        "One major supplier was going into bankruptcy which we didn't know until their delivery stopped. Need to monitor supplier financial indicators.",
      category: "FEATURE_REQUEST",
      priority: "HIGH",
    },
    {
      projectId: projects.find((p) => p.name === "Raw Material Planning")?.id,
      title: "Material consumption forecasting showing -20% error",
      description:
        "Forecast for fluoride compound consumption is consistently 20% lower than actual. Model may need retraining on recent data.",
      category: "BUG",
      priority: "HIGH",
    },
    {
      projectId: projects.find((p) => p.name === "Raw Material Planning")?.id,
      title: "Expedited shipping cost optimization missing",
      description:
        "When emergency material is needed, system doesn't compare expedited shipping options (air, express, etc) or consolidation with other POs.",
      category: "FEATURE_REQUEST",
      priority: "MEDIUM",
    },
    {
      projectId: projects.find((p) => p.name === "Raw Material Planning")?.id,
      title: "Supplier diversity reporting incomplete",
      description:
        "Cannot filter or report on orders from minority-owned or women-owned suppliers. Need compliance reporting capability.",
      category: "FEATURE_REQUEST",
      priority: "MEDIUM",
    },
    {
      projectId: projects.find((p) => p.name === "Raw Material Planning")?.id,
      title: "Material shelf-life not tracked",
      description:
        "Some raw materials have 12-month shelf life but system doesn't warn when receiving old stock or about-to-expire inventory.",
      category: "BUG",
      priority: "HIGH",
    },
    {
      projectId: projects.find((p) => p.name === "Raw Material Planning")?.id,
      title: "Add seasonal supplier capacity planning",
      description:
        "During peak seasons, our suppliers tell us they have limited capacity but system doesn't build in capacity buffer for seasonal demand spikes.",
      category: "FEATURE_REQUEST",
      priority: "MEDIUM",
    },
  ];

  let created = 0;
  const statusDistribution = ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED", "CLOSED"];
  let ticketIndex = 0;

  for (const template of ticketTemplates) {
    if (!template.projectId) continue;

    // Distribute statuses evenly
    const status = statusDistribution[ticketIndex % statusDistribution.length];
    const priority = template.priority as any;
    const category = template.category as any;

    // Calculate SLA due date based on priority
    const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Random time within last 30 days
    const slaPriorityMap: Record<string, number> = {
      CRITICAL: 4,
      HIGH: 24,
      MEDIUM: 72,
      LOW: 168,
    };
    const hours = slaPriorityMap[priority] || 72;
    const slaDueAt = new Date(createdAt.getTime() + hours * 60 * 60 * 1000);

    // Assign to random 3SC user
    const assignedUser = users[Math.floor(Math.random() * users.length)];

    const ticket = await prisma.issue.create({
      data: {
        title: template.title,
        description: template.description,
        category,
        priority,
        status,
        clientId: colgate.id,
        projectId: template.projectId,
        raisedById: colgateUser.id,
        assignedToId: assignedUser.id,
        slaDueAt,
        createdAt,
        updatedAt: createdAt,
      },
    });

    // Generate ticket key
    const ticketKey = await generateTicketKey(template.projectId);
    await prisma.issue.update({
      where: { id: ticket.id },
      data: { ticketKey },
    });

    // Add comments for RESOLVED tickets (resolution threads)
    if (status === "RESOLVED") {
      const agent = users[Math.floor(Math.random() * users.length)];
      const approver = users[Math.floor(Math.random() * users.length)];

      // Comment 1: Initial diagnosis
      const comment1 = await prisma.comment.create({
        data: {
          issueId: ticket.id,
          authorId: agent.id,
          content: `I've reviewed the ticket and started investigating the root cause. Initial findings suggest this is related to ${
            ["recent code deployment", "database migration", "API endpoint change", "configuration update"][
              Math.floor(Math.random() * 4)
            ]
          }. Let me run some diagnostics and report back within the next few hours.`,
          isInternal: false,
        },
      });

      // Comment 2: Investigation findings
      const comment2 = await prisma.comment.create({
        data: {
          issueId: ticket.id,
          authorId: agent.id,
          content: `Found the issue! The problem was in the calculation logic where we were using stale data. I've identified the exact code section and prepared a fix. Will implement and test in a staging environment first.`,
          isInternal: false,
          parentId: comment1.id,
        },
      });

      // Comment 3: Fix implementation
      const comment3 = await prisma.comment.create({
        data: {
          issueId: ticket.id,
          authorId: agent.id,
          content: `Fix has been implemented and tested in staging. All unit tests pass. The issue was in the ${
            ["optimization algorithm", "data validation layer", "API response transformer", "caching mechanism"][
              Math.floor(Math.random() * 4)
            ]
          }. Ready for code review and production deployment.`,
          isInternal: false,
          parentId: comment2.id,
        },
      });

      // Comment 4: Approval/Testing
      const comment4 = await prisma.comment.create({
        data: {
          issueId: ticket.id,
          authorId: approver.id,
          content: `Code review completed. Changes look good and follow our standards. Approved for production deployment.`,
          isInternal: false,
          parentId: comment3.id,
        },
      });

      // Comment 5: Resolution
      const comment5 = await prisma.comment.create({
        data: {
          issueId: ticket.id,
          authorId: agent.id,
          content: `✅ Fix deployed to production. Monitoring indicates the issue is resolved. ${
            ["Calculations now match expected values", "Performance improved by 40%", "Alerts are triggering correctly", "Data is now consistent"][
              Math.floor(Math.random() * 4)
            ]
          }. Closing ticket.`,
          isInternal: false,
          parentId: comment4.id,
        },
      });

      // Update ticket with resolved status and timestamps
      await prisma.issue.update({
        where: { id: ticket.id },
        data: {
          status: "RESOLVED",
          resolvedAt: new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000), // Resolved 3 days after creation
          closedAt: new Date(createdAt.getTime() + 4 * 24 * 60 * 60 * 1000), // Closed 4 days after creation
        },
      });
    } else if (status === "IN_PROGRESS") {
      // Add a single comment for IN_PROGRESS tickets
      await prisma.comment.create({
        data: {
          issueId: ticket.id,
          authorId: assignedUser.id,
          content: `Working on this issue now. Have identified the root cause and implementing a solution. Expected completion within 2 days.`,
          isInternal: false,
        },
      });
    } else if (status === "ACKNOWLEDGED") {
      // Add a single comment for ACKNOWLEDGED tickets
      await prisma.comment.create({
        data: {
          issueId: ticket.id,
          authorId: assignedUser.id,
          content: `Ticket acknowledged. I've added this to my queue and will begin investigation shortly.`,
          isInternal: false,
        },
      });
    }

    console.log(
      `✓ Created: "${template.title}" (${ticketKey || "key-pending"}) - Status: ${status}`,
    );
    created++;
    ticketIndex++;
  }

  console.log(`\n✅ Created ${created} tickets for Colgate Palmolive!`);
}

createColgateTickets()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

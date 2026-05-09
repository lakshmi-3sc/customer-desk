import { prisma } from "@/lib/prisma";
import { generateTicketKey } from "@/lib/ticket-key";
import type { IssueCategory, IssuePriority, IssueStatus } from "@prisma/client";

type TicketTemplate = {
  projectId?: string;
  title: string;
  description: string;
  category: IssueCategory;
  priority: IssuePriority;
};

async function createColgateTicketsPart2() {
  console.log("🎫 Creating 6 additional tickets for Colgate Palmolive projects...\n");

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

  const additionalTickets: TicketTemplate[] = [
    {
      projectId: projects.find((p) => p.name === "Replenishment Planning")?.id,
      title: "Integration with third-party logistics platform fails intermittently",
      description:
        "Our 3PL provider's API returns 500 errors every few hours. When this happens, we can't pull real-time inventory from their warehouses. Started happening after their system upgrade last week.",
      category: "BUG",
      priority: "CRITICAL",
    },
    {
      projectId: projects.find((p) => p.name === "Production Planning")?.id,
      title: "Multi-line coordination not optimizing for changeover reduction",
      description:
        "When scheduling products across our 4 production lines, the system doesn't coordinate to minimize product changeovers. Each line is optimized independently.",
      category: "BUG",
      priority: "HIGH",
    },
    {
      projectId: projects.find((p) => p.name === "Raw Material Planning")?.id,
      title: "Supplier qualification status not blocking new POs",
      description:
        "We had a supplier with failed quality audits still able to receive new purchase orders. Compliance issue that could expose us to regulatory risk.",
      category: "BUG",
      priority: "CRITICAL",
    },
    {
      projectId: projects.find((p) => p.name === "Replenishment Planning")?.id,
      title: "Add scenario planning for demand disruptions",
      description:
        "Want to model what happens to inventory if a major supplier goes offline, or demand spikes 50%. Need simulation capability.",
      category: "FEATURE_REQUEST",
      priority: "HIGH",
    },
    {
      projectId: projects.find((p) => p.name === "Production Planning")?.id,
      title: "Line speed optimization not matching actual machine capabilities",
      description:
        "Scheduled line speeds exceed machine ratings by 10-15%. Operators manually slow down but schedule still shows impossible targets.",
      category: "BUG",
      priority: "HIGH",
    },
    {
      projectId: projects.find((p) => p.name === "Raw Material Planning")?.id,
      title: "Landed cost calculation missing import duties and taxes",
      description:
        "True cost of imported materials is 15-20% higher than what system shows. Excluding duties, tariffs, and freight from cost calculation.",
      category: "BUG",
      priority: "MEDIUM",
    },
  ];

  let created = 0;
  const statusDistribution: IssueStatus[] = ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED", "CLOSED"];
  let ticketIndex = 0;

  for (const template of additionalTickets) {
    if (!template.projectId) continue;

    const status = statusDistribution[ticketIndex % statusDistribution.length];
    const priority = template.priority;
    const category = template.category;

    const createdAt = new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000);
    const slaPriorityMap: Record<string, number> = {
      CRITICAL: 4,
      HIGH: 24,
      MEDIUM: 72,
      LOW: 168,
    };
    const hours = slaPriorityMap[priority] || 72;
    const slaDueAt = new Date(createdAt.getTime() + hours * 60 * 60 * 1000);

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

    const ticketKey = await generateTicketKey(template.projectId);
    await prisma.issue.update({
      where: { id: ticket.id },
      data: { ticketKey },
    });

    if (status === "RESOLVED") {
      const agent = users[Math.floor(Math.random() * users.length)];
      const approver = users[Math.floor(Math.random() * users.length)];

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

      const comment2 = await prisma.comment.create({
        data: {
          issueId: ticket.id,
          authorId: agent.id,
          content: `Found the issue! The problem was in the calculation logic where we were using stale data. I've identified the exact code section and prepared a fix. Will implement and test in a staging environment first.`,
          isInternal: false,
          parentId: comment1.id,
        },
      });

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

      const comment4 = await prisma.comment.create({
        data: {
          issueId: ticket.id,
          authorId: approver.id,
          content: `Code review completed. Changes look good and follow our standards. Approved for production deployment.`,
          isInternal: false,
          parentId: comment3.id,
        },
      });

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

      await prisma.issue.update({
        where: { id: ticket.id },
        data: {
          status: "RESOLVED",
          resolvedAt: new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000),
          closedAt: new Date(createdAt.getTime() + 4 * 24 * 60 * 60 * 1000),
        },
      });
    } else if (status === "IN_PROGRESS") {
      await prisma.comment.create({
        data: {
          issueId: ticket.id,
          authorId: assignedUser.id,
          content: `Working on this issue now. Have identified the root cause and implementing a solution. Expected completion within 2 days.`,
          isInternal: false,
        },
      });
    } else if (status === "ACKNOWLEDGED") {
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

  console.log(`\n✅ Created ${created} additional tickets for Colgate Palmolive!`);
}

createColgateTicketsPart2()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

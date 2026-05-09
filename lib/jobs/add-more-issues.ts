import { prisma } from "@/lib/prisma";
import { generateTicketKey } from "@/lib/ticket-key";

async function addMoreIssues() {
  console.log("📝 Adding more diverse issues...\n");

  // Get Colgate client and projects
  const colgate = await prisma.client.findFirst({ where: { name: "Colgate Palmolive" } });
  const replenProject = await prisma.project.findFirst({
    where: { clientId: colgate?.id, name: "Replenishment Planning" },
  });
  const prodProject = await prisma.project.findFirst({
    where: { clientId: colgate?.id, name: "Production Planning" },
  });

  // Get users
  const sneha = await prisma.user.findUnique({ where: { email: "sneha.pillai@3sc.com" } });
  const ravi = await prisma.user.findUnique({ where: { email: "ravi.kumar@3sc.com" } });
  const rohan = await prisma.user.findUnique({ where: { email: "rohan.verma@colgate.com" } });

  if (!colgate || !replenProject || !rohan) {
    console.error("❌ Missing required data");
    return;
  }

  const issues = [
    {
      title: "Database connection pool exhausted - production down",
      description: "Production unable to establish DB connections. All users locked out.",
      category: "BUG",
      priority: "CRITICAL",
      status: "OPEN",
      clientId: colgate.id,
      projectId: replenProject.id,
      raisedById: rohan.id,
      assignedToId: null,
    },
    {
      title: "Memory leak causing server crashes every 4 hours",
      description: "Node memory grows unbounded causing automatic restarts.",
      category: "BUG",
      priority: "CRITICAL",
      status: "OPEN",
      clientId: colgate.id,
      projectId: replenProject.id,
      raisedById: rohan.id,
      assignedToId: null,
    },
    {
      title: "API response time degraded - 30+ seconds",
      description: "Recent schema changes causing N+1 queries.",
      category: "BUG",
      priority: "HIGH",
      status: "IN_PROGRESS",
      clientId: colgate.id,
      projectId: replenProject.id,
      raisedById: rohan.id,
      assignedToId: sneha?.id,
    },
    {
      title: "Batch export fails with files >100MB",
      description: "Stream handling issue causes timeout on large exports.",
      category: "BUG",
      priority: "HIGH",
      status: "IN_PROGRESS",
      clientId: colgate.id,
      projectId: prodProject?.id || replenProject.id,
      raisedById: rohan.id,
      assignedToId: ravi?.id,
    },
    {
      title: "Improve dashboard load time with caching",
      description: "Dashboard takes 5+ seconds to load. Need Redis caching.",
      category: "FEATURE_REQUEST",
      priority: "MEDIUM",
      status: "ACKNOWLEDGED",
      clientId: colgate.id,
      projectId: replenProject.id,
      raisedById: rohan.id,
      assignedToId: null,
    },
    {
      title: "Add bulk operations for inventory adjustments",
      description: "Users need to adjust 100+ SKUs at once.",
      category: "FEATURE_REQUEST",
      priority: "MEDIUM",
      status: "ACKNOWLEDGED",
      clientId: colgate.id,
      projectId: replenProject.id,
      raisedById: rohan.id,
      assignedToId: null,
    },
  ];

  for (const issue of issues) {
    const ticketKey = await generateTicketKey(issue.projectId);
    const created = await prisma.issue.create({ data: { ...issue, ticketKey } });
    console.log(`✓ ${ticketKey} - ${created.status} - ${created.priority}`);
  }

  console.log("\n✅ Added 6 more issues!");
}

addMoreIssues().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

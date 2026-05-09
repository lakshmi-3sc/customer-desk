import { prisma } from "@/lib/prisma";

// Helper function to calculate SLA due date based on priority
function calculateSlaDueDate(priority: string, createdAt: Date): Date {
  const slaHours: Record<string, number> = {
    CRITICAL: 4,    // 4 hours resolution time
    HIGH: 24,       // 24 hours resolution time
    MEDIUM: 72,     // 72 hours resolution time
    LOW: 168,       // 7 days resolution time
  };
  const hours = slaHours[priority] || 72;
  return new Date(createdAt.getTime() + hours * 60 * 60 * 1000);
}

async function addSlaDates() {
  console.log("⏱️  Adding SLA due dates to all issues...\n");

  const issues = await prisma.issue.findMany({
    where: { status: { in: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"] } },
  });

  let updated = 0;
  for (const issue of issues) {
    const slaDueAt = calculateSlaDueDate(issue.priority, issue.createdAt);
    await prisma.issue.update({
      where: { id: issue.id },
      data: { slaDueAt },
    });
    updated++;
  }

  console.log(`✅ Updated ${updated} issues with SLA due dates`);
}

addSlaDates()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

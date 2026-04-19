/**
 * One-time script to backfill ticketKey for existing tickets that don't have one.
 * Run with: npx tsx scripts/backfill-ticket-keys.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const issues = await prisma.issue.findMany({
    where: { ticketKey: null },
    include: { project: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${issues.length} tickets without keys`);

  const prefixCounters: Record<string, number> = {};

  for (const issue of issues) {
    let prefix = "TKT";
    if (issue.project) {
      prefix = issue.project.name
        .split(/\s+/)
        .map((w) => w[0] ?? "")
        .join("")
        .toUpperCase()
        .slice(0, 4);
    }

    // Count existing keys for this prefix in DB + those we've already assigned
    if (!(prefix in prefixCounters)) {
      const existing = await prisma.issue.count({
        where: {
          ticketKey: { startsWith: `${prefix}-` },
          NOT: { id: { in: issues.map((i) => i.id) } },
        },
      });
      prefixCounters[prefix] = existing;
    }

    prefixCounters[prefix]++;
    const ticketKey = `${prefix}-${1000 + prefixCounters[prefix]}`;

    await prisma.issue.update({
      where: { id: issue.id },
      data: { ticketKey },
    });

    console.log(`  ${issue.id} → ${ticketKey}`);
  }

  console.log("Done.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

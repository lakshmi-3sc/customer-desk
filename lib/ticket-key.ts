import { prisma } from "@/lib/prisma";

/**
 * Generate the next sequential ticket key for a project, e.g. "SCD-1042".
 * The project key is derived from the project name (up to 4 uppercase initials).
 * If no project, falls back to "TKT".
 */
export async function generateTicketKey(
  projectId: string | null | undefined,
): Promise<string> {
  let prefix = "TKT";

  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true },
    });
    if (project) {
      prefix = project.name
        .split(/\s+/)
        .map((w) => w[0] ?? "")
        .filter((c) => /[A-Za-z]/.test(c))
        .join("")
        .toUpperCase()
        .slice(0, 4);
    }
  }

  const existingKeys = await prisma.issue.findMany({
    where: {
      ticketKey: { startsWith: `${prefix}-` },
    },
    select: { ticketKey: true },
  });

  const maxSuffix = existingKeys.reduce((max, issue) => {
    const suffix = issue.ticketKey?.slice(prefix.length + 1) ?? "";
    const value = Number.parseInt(suffix, 10);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 1000);

  return `${prefix}-${maxSuffix + 1}`;
}

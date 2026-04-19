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
        .join("")
        .toUpperCase()
        .slice(0, 4);
    }
  }

  // Count existing tickets with this prefix to derive the next number
  const count = await prisma.issue.count({
    where: { ticketKey: { startsWith: `${prefix}-` } },
  });

  return `${prefix}-${1000 + count + 1}`;
}

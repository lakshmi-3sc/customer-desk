import { prisma } from "@/lib/prisma";

/**
 * Resolve a ticket by either its ticketKey (e.g. "SCD-1042") or its cuid.
 * Returns the internal UUID id.
 */
export async function resolveTicketId(idOrKey: string): Promise<string | null> {
  // ticketKey pattern: uppercase letters + hyphen + digits
  if (/^[A-Z]+-\d+$/.test(idOrKey)) {
    const issue = await prisma.issue.findUnique({
      where: { ticketKey: idOrKey },
      select: { id: true },
    });
    return issue?.id ?? null;
  }
  // Otherwise treat as internal cuid
  const issue = await prisma.issue.findUnique({
    where: { id: idOrKey },
    select: { id: true },
  });
  return issue?.id ?? null;
}

import { prisma } from "@/lib/prisma";

/**
 * Resolve a ticket by either its ticketKey (e.g. "SCD-1042") or its cuid.
 * Returns the internal UUID id.
 */
export async function resolveTicketId(idOrKey: string): Promise<string | null> {
  // Always try ticketKey first (handles any format including legacy malformed keys)
  const byKey = await prisma.issue.findUnique({
    where: { ticketKey: idOrKey },
    select: { id: true },
  });
  if (byKey) return byKey.id;

  // Fall back to internal cuid
  const byId = await prisma.issue.findUnique({
    where: { id: idOrKey },
    select: { id: true },
  });
  return byId?.id ?? null;
}

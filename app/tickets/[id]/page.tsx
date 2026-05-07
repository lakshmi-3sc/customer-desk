import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveTicketId } from "@/lib/resolve-ticket";
import { notFound } from "next/navigation";
import TicketDetail from "./TicketDetail";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idOrKey } = await params;

  // Resolve ticketKey (e.g. "CRVO-1022") or internal cuid to the DB id
  const ticketId = await resolveTicketId(idOrKey);
  if (!ticketId) notFound();

  const session = await getServerSession(authOptions);
  const isClient =
    session?.user?.role &&
    ["CLIENT_USER", "CLIENT_ADMIN"].includes(session.user.role);

  // Fetch ticket + comments in parallel directly from DB — no HTTP round trip
  const [ticket, allComments] = await Promise.all([
    prisma.issue.findUnique({
      where: { id: ticketId },
      include: {
        raisedBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        attachments: true,
      },
    }),
    prisma.comment.findMany({
      where: {
        issueId: ticketId,
        // Clients cannot see internal notes
        ...(isClient ? { isInternal: false } : {}),
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!ticket) notFound();

  // Build comment tree (top-level + nested replies)
  type C = (typeof allComments)[0] & { replies: C[] };
  const map = new Map<string, C>();
  allComments.forEach((c) => map.set(c.id, { ...c, replies: [] }));
  const roots: C[] = [];
  map.forEach((c) => {
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.replies.push(c);
    } else {
      roots.push(c);
    }
  });

  // Serialize: convert Date objects → ISO strings so client component receives
  // plain JSON (Prisma returns Date, client Ticket interface expects string)
  const serialized = JSON.parse(JSON.stringify({ ticket, comments: roots })) as {
    ticket: typeof ticket;
    comments: typeof roots;
  };

  return (
    <TicketDetail
      initialTicket={serialized.ticket}
      initialComments={serialized.comments}
      idOrKey={idOrKey}
    />
  );
}

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveTicketId } from "@/lib/resolve-ticket";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import TicketDetail from "./TicketDetail";

type Jsonified<T> =
  T extends Date ? string :
  T extends Array<infer U> ? Jsonified<U>[] :
  T extends object ? { [K in keyof T]: Jsonified<T[K]> } :
  T;

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

  if (isClient) {
    const membership = await prisma.clientMember.findFirst({
      where: {
        userId: session.user.id,
        clientId: ticket.client.id,
      },
      select: { id: true },
    });

    if (!membership) {
      return <TicketAccessDenied />;
    }
  }

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
    ticket: Jsonified<NonNullable<typeof ticket>>;
    comments: Jsonified<typeof roots>;
  };

  return (
    <TicketDetail
      initialTicket={serialized.ticket}
      initialComments={serialized.comments}
      idOrKey={idOrKey}
    />
  );
}

function TicketAccessDenied() {
  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F8F9FB] dark:bg-slate-950">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          left={
            <nav className="flex items-center gap-1.5 text-sm">
              <Link href="/dashboard" className="text-[#0052CC] hover:underline">
                Dashboard
              </Link>
              <span className="text-slate-300">/</span>
              <Link href="/tickets" className="text-[#0052CC] hover:underline">
                Issues
              </Link>
              <span className="text-slate-300">/</span>
              <span className="font-semibold text-slate-600 dark:text-slate-400">
                Access denied
              </span>
            </nav>
          }
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto mt-24 max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#0052CC] dark:bg-blue-950/40">
              <LockKeyhole className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              You do not have access to this ticket
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
              This issue belongs to a different workspace, or your account does not have permission to view it.
            </p>
            <div className="mt-7 flex items-center justify-center gap-3">
              <Link
                href="/tickets"
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Back to issues
              </Link>
              <Link
                href="/dashboard"
                className="rounded-md bg-[#0052CC] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0747A6]"
              >
                Go to dashboard
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

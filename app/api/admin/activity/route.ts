import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'THREESC_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId') || null;
  const clientWhere = clientId ? { clientId } : {};
  const since = new Date(Date.now() - 7 * 86400000);

  const [historyEntries, recentEscalations, recentSlaBreaches, aiComments] = await Promise.all([
    prisma.issueHistory.findMany({
      where: {
        fieldChanged: { in: ['assignedToId', 'status', 'priority'] },
        createdAt: { gte: since },
        ...(clientId ? { issue: { clientId } } : {}),
      },
      include: {
        changedBy: { select: { name: true } },
        issue: {
          select: {
            id: true, title: true, ticketKey: true, priority: true,
            client: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 40,
    }),
    prisma.issue.findMany({
      where: { escalated: true, escalatedAt: { gte: since }, ...clientWhere },
      select: {
        id: true, title: true, ticketKey: true, priority: true, escalatedAt: true,
        client: { select: { name: true } },
        escalatedTo: { select: { name: true } },
      },
      orderBy: { escalatedAt: 'desc' },
      take: 15,
    }),
    prisma.issue.findMany({
      where: { slaBreached: true, updatedAt: { gte: since }, ...clientWhere },
      select: {
        id: true, title: true, ticketKey: true, priority: true, updatedAt: true,
        client: { select: { name: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 15,
    }),
    prisma.comment.findMany({
      where: {
        isAiSuggested: true,
        createdAt: { gte: since },
        ...(clientId ? { issue: { clientId } } : {}),
      },
      select: {
        id: true, createdAt: true,
        issue: {
          select: { id: true, title: true, ticketKey: true, client: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 15,
    }),
  ]);

  type FeedEntry = {
    id: string;
    type: 'escalated' | 'sla_breached' | 'assigned' | 'resolved' | 'status_changed' | 'ai_routed' | 'priority_changed';
    message: string;
    sub: string;
    ticketKey: string | null;
    issueId: string;
    time: string;
    priority?: string;
  };

  const feed: FeedEntry[] = [];

  // Escalations
  for (const esc of recentEscalations) {
    feed.push({
      id: `esc-${esc.id}`,
      type: 'escalated',
      message: `Ticket escalated`,
      sub: `${esc.ticketKey ?? esc.id.slice(0, 8)} · ${esc.client.name}`,
      ticketKey: esc.ticketKey,
      issueId: esc.id,
      time: (esc.escalatedAt ?? new Date()).toISOString(),
      priority: esc.priority,
    });
  }

  // SLA breaches
  for (const issue of recentSlaBreaches) {
    feed.push({
      id: `sla-${issue.id}`,
      type: 'sla_breached',
      message: `SLA breached`,
      sub: `${issue.ticketKey ?? issue.id.slice(0, 8)} · ${issue.client.name}`,
      ticketKey: issue.ticketKey,
      issueId: issue.id,
      time: issue.updatedAt.toISOString(),
      priority: issue.priority,
    });
  }

  // AI suggestions
  for (const comment of aiComments) {
    feed.push({
      id: `ai-${comment.id}`,
      type: 'ai_routed',
      message: `AI suggested response`,
      sub: `${comment.issue.ticketKey ?? comment.issue.id.slice(0, 8)} · ${comment.issue.client.name}`,
      ticketKey: comment.issue.ticketKey,
      issueId: comment.issue.id,
      time: comment.createdAt.toISOString(),
    });
  }

  // History entries
  for (const h of historyEntries) {
    if (h.fieldChanged === 'assignedToId' && h.newValue) {
      feed.push({
        id: `hist-${h.id}`,
        type: 'assigned',
        message: `${h.changedBy.name} assigned issue`,
        sub: `${h.issue.ticketKey ?? h.issue.id.slice(0, 8)} · ${h.issue.client.name}`,
        ticketKey: h.issue.ticketKey,
        issueId: h.issue.id,
        time: h.createdAt.toISOString(),
        priority: h.issue.priority,
      });
    } else if (h.fieldChanged === 'status' && h.newValue === 'RESOLVED') {
      feed.push({
        id: `hist-${h.id}`,
        type: 'resolved',
        message: `${h.changedBy.name} resolved ticket`,
        sub: `${h.issue.ticketKey ?? h.issue.id.slice(0, 8)} · ${h.issue.client.name}`,
        ticketKey: h.issue.ticketKey,
        issueId: h.issue.id,
        time: h.createdAt.toISOString(),
      });
    } else if (h.fieldChanged === 'priority' && h.newValue === 'CRITICAL') {
      feed.push({
        id: `hist-${h.id}`,
        type: 'priority_changed',
        message: `Priority escalated to Critical`,
        sub: `${h.issue.ticketKey ?? h.issue.id.slice(0, 8)} · ${h.issue.client.name}`,
        ticketKey: h.issue.ticketKey,
        issueId: h.issue.id,
        time: h.createdAt.toISOString(),
      });
    }
  }

  // Deduplicate by issueId+type, sort newest first, cap at 30
  const seen = new Set<string>();
  const deduped = feed
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .filter((e) => {
      const key = `${e.type}-${e.issueId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 30);

  return NextResponse.json({ feed: deduped });
}

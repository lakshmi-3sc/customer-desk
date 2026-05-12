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
  const dateFrom = searchParams.get('from');
  const dateTo = searchParams.get('to');
  const actorId = searchParams.get('actor') || '';

  // Use IssueHistory as audit trail source
  const history = await prisma.issueHistory.findMany({
    where: {
      ...(dateFrom && { createdAt: { gte: new Date(dateFrom) } }),
      ...(dateTo && { createdAt: { lte: new Date(dateTo + 'T23:59:59') } }),
      ...(actorId && { changedById: actorId }),
    },
    include: {
      changedBy: { select: { id: true, name: true, role: true } },
      issue: { select: { ticketKey: true, title: true, id: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const assignedUserIds = Array.from(new Set(
    history
      .filter((entry) => entry.fieldChanged === 'assignedToId')
      .flatMap((entry) => [entry.oldValue, entry.newValue])
      .filter((value): value is string => Boolean(value))
  ));

  const assignedUsers = assignedUserIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: assignedUserIds } },
        select: { id: true, name: true },
      })
    : [];

  const userNameById = new Map(assignedUsers.map((user) => [user.id, user.name]));

  const actionLabels: Record<string, string> = {
    status: 'Status changed',
    priority: 'Priority changed',
    category: 'Category changed',
    assignedToId: 'Assigned',
    title: 'Title edited',
    escalated: 'Escalated',
  };

  const displayValue = (entry: (typeof history)[number], value: string | null) => {
    if (!value) return null;
    if (entry.fieldChanged === 'assignedToId') return userNameById.get(value) ?? 'Unknown user';
    if (entry.fieldChanged === 'escalated' && (value === 'true' || value === 'false')) return null;
    return value;
  };

  // Map createdAt to changedAt for frontend compatibility
  const audit = history.map((entry) => ({
    ...entry,
    changedAt: entry.createdAt,
    actionLabel: actionLabels[entry.fieldChanged] ?? entry.fieldChanged.replace(/([A-Z])/g, ' $1').trim(),
    displayOldValue: displayValue(entry, entry.oldValue),
    displayNewValue: displayValue(entry, entry.newValue),
  }));

  return NextResponse.json({ audit });
}

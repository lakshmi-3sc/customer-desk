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

  return NextResponse.json({ audit: history });
}

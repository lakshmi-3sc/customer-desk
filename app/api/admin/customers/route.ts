import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'THREESC_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const clients = await prisma.client.findMany({
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, role: true, isActive: true } } } },
      issues: { select: { status: true, slaBreached: true, createdAt: true } },
      projects: { select: { id: true, name: true, status: true } },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ clients });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'THREESC_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { name, industry, logoUrl } = body;
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const client = await prisma.client.create({
    data: { name: name.trim(), industry: industry?.trim() || null, logoUrl: logoUrl?.trim() || null },
  });

  return NextResponse.json({ client }, { status: 201 });
}

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
  const role = searchParams.get('role') || '';
  const status = searchParams.get('status') || '';
  const clientId = searchParams.get('clientId') || '';

  const users = await prisma.user.findMany({
    where: {
      ...(role && { role: role as any }),
      ...(status === 'active' && { isActive: true }),
      ...(status === 'inactive' && { isActive: false }),
      ...(clientId && {
        clientMembers: { some: { clientId } },
      }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      clientMembers: {
        select: {
          client: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ users });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'THREESC_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { userId, role, isActive } = body;
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(role !== undefined && { role }),
      ...(isActive !== undefined && { isActive }),
    },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  return NextResponse.json({ user: updated });
}

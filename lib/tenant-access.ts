import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";

export type AccessUser = {
  id: string;
  email: string;
  role: string;
};

export function is3SCRole(role: string | null | undefined) {
  return Boolean(role?.startsWith("THREESC_"));
}

export function isClientRole(role: string | null | undefined) {
  return role === "CLIENT_ADMIN" || role === "CLIENT_USER";
}

export async function getAccessUser(session: Session | null): Promise<AccessUser | null> {
  const sessionUser = session?.user as { id?: string; email?: string | null; role?: string } | undefined;
  const id = sessionUser?.id;
  const email = sessionUser?.email;

  if (id) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true },
    });
    return user;
  }

  if (email) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true },
    });
    return user;
  }

  return null;
}

export async function getUserClientIds(userId: string): Promise<string[]> {
  const memberships = await prisma.clientMember.findMany({
    where: { userId },
    select: { clientId: true },
  });

  return memberships.map((membership) => membership.clientId);
}

export async function canAccessTicket(user: AccessUser, ticketId: string): Promise<boolean> {
  const ticket = await prisma.issue.findUnique({
    where: { id: ticketId },
    select: { clientId: true },
  });

  if (!ticket) return false;
  if (is3SCRole(user.role)) return true;
  if (!isClientRole(user.role) || !ticket.clientId) return false;

  const membership = await prisma.clientMember.findFirst({
    where: { userId: user.id, clientId: ticket.clientId },
    select: { id: true },
  });

  return Boolean(membership);
}

export async function canAccessKnowledgeBaseArticle(user: AccessUser, articleId: string): Promise<boolean> {
  const article = await prisma.knowledgeBase.findUnique({
    where: { id: articleId },
    select: {
      clientId: true,
      isInternal: true,
      isPublished: true,
    },
  });

  if (!article) return false;
  if (is3SCRole(user.role)) return true;
  if (!isClientRole(user.role) || !article.isPublished || article.isInternal) return false;
  if (!article.clientId) return true;

  const membership = await prisma.clientMember.findFirst({
    where: { userId: user.id, clientId: article.clientId },
    select: { id: true },
  });

  return Boolean(membership);
}


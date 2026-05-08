import { prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";
import { sendEmail } from "@/lib/email";
import {
  ticketAssignedEmail,
  statusChangedEmail,
  newCommentEmail,
  slaWarningEmail,
  escalationEmail,
} from "@/lib/email-templates";

export async function findUserByMention(mention: string) {
  return prisma.user.findFirst({
    where: {
      OR: [
        { name: { equals: mention, mode: "insensitive" } },
        { email: { equals: mention, mode: "insensitive" } },
      ],
    },
  });
}

// Extra context needed to build email bodies — callers pass this alongside the notification
export interface EmailContext {
  ticketKey?: string;
  ticketId?: string;
  ticketTitle?: string;
  ticketPriority?: string;
  fromStatus?: string;
  toStatus?: string;
  actorName?: string;          // person who triggered the event
  clientName?: string;
  commentPreview?: string;
  isMention?: boolean;
  slaDueAt?: Date;
}

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  issueId?: string,
  emailCtx?: EmailContext,
) {
  try {
    // Persist in-app notification
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message: message.substring(0, 500),
        issueId,
      },
    });

    // Fire email in background — never await, never throw
    sendEmailForNotification(userId, type, emailCtx).catch((e) =>
      console.error("[createNotification] email error:", e)
    );

    return notification;
  } catch (error) {
    console.error("[createNotification] Error:", error);
  }
}

async function sendEmailForNotification(
  userId: string,
  type: NotificationType,
  ctx?: EmailContext,
) {
  if (!ctx) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (!user?.email) return;

  const key = ctx.ticketKey ?? "";
  const id = ctx.ticketId ?? "";
  const title = ctx.ticketTitle ?? "Ticket";
  const priority = ctx.ticketPriority ?? "MEDIUM";
  const actor = ctx.actorName ?? "Someone";

  let template: { subject: string; html: string } | null = null;

  switch (type) {
    case "ISSUE_ASSIGNED":
      template = ticketAssignedEmail({
        ticketKey: key,
        ticketId: id,
        title,
        priority,
        assignedToName: user.name,
        assignedByName: actor,
      });
      break;

    case "STATUS_UPDATED":
      template = statusChangedEmail({
        ticketKey: key,
        ticketId: id,
        title,
        fromStatus: ctx.fromStatus ?? "",
        toStatus: ctx.toStatus ?? "",
        changedByName: actor,
      });
      break;

    case "NEW_COMMENT":
      template = newCommentEmail({
        ticketKey: key,
        ticketId: id,
        title,
        commentPreview: ctx.commentPreview ?? "",
        authorName: actor,
        isMention: ctx.isMention ?? false,
      });
      break;

    case "SLA_WARNING":
      if (ctx.slaDueAt) {
        template = slaWarningEmail({
          ticketKey: key,
          ticketId: id,
          title,
          priority,
          slaDueAt: ctx.slaDueAt,
          clientName: ctx.clientName ?? "",
        });
      }
      break;

    case "ESCALATION":
      template = escalationEmail({
        ticketKey: key,
        ticketId: id,
        title,
        priority,
        escalatedByName: actor,
        clientName: ctx.clientName ?? "",
      });
      break;

    case "ISSUE_RESOLVED":
      template = statusChangedEmail({
        ticketKey: key,
        ticketId: id,
        title,
        fromStatus: "IN_PROGRESS",
        toStatus: "RESOLVED",
        changedByName: actor,
      });
      break;

    default:
      return;
  }

  if (template) {
    await sendEmail({ to: user.email, ...template });
  }
}

export function extractMentions(text: string): string[] {
  const regex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    mentions.push(match[1]);
  }
  return [...new Set(mentions)];
}

export async function getMentionableUsers(
  currentUserId: string,
  ticketId: string
) {
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
    });

    const ticket = await prisma.issue.findUnique({
      where: { id: ticketId },
      include: { client: true },
    });

    if (!currentUser || !ticket) return [];

    const is3SC = currentUser.role?.startsWith("THREESC_");
    console.log(`[getMentionableUsers] is3SC: ${is3SC}, clientId: ${ticket.clientId}`);

    const threescUsers = await prisma.user.findMany({
      where: { role: { in: ["THREESC_ADMIN", "THREESC_LEAD", "THREESC_AGENT"] } },
    });

    const clientUsers = await prisma.user.findMany({
      where: { clientMembers: { some: { clientId: ticket.clientId } } },
    });

    const userMap = new Map();
    [...clientUsers, ...threescUsers].forEach((user) => {
      if (!userMap.has(user.id)) userMap.set(user.id, user);
    });

    return Array.from(userMap.values());
  } catch (error) {
    console.error("[getMentionableUsers] Error:", error);
    return [];
  }
}

export async function isUserMentionable(
  mentionedUserId: string,
  currentUserId: string,
  ticketId: string
): Promise<boolean> {
  try {
    const mentionable = await getMentionableUsers(currentUserId, ticketId);
    return mentionable.some((u) => u.id === mentionedUserId);
  } catch (error) {
    console.error("[isUserMentionable] Error:", error);
    return false;
  }
}

export async function getStatusChangeRecipients(
  issueId: string,
  updatedById: string
) {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    select: {
      assignedToId: true,
      raisedById: true,
      escalatedToId: true,
      comments: {
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        select: { authorId: true },
        distinct: ["authorId"],
      },
    },
  });

  if (!issue) return [];

  const recipientIds = new Set<string>();

  if (issue.assignedToId && issue.assignedToId !== updatedById)
    recipientIds.add(issue.assignedToId);
  if (issue.raisedById && issue.raisedById !== updatedById)
    recipientIds.add(issue.raisedById);
  if (issue.escalatedToId && issue.escalatedToId !== updatedById)
    recipientIds.add(issue.escalatedToId);

  issue.comments.forEach((c) => {
    if (c.authorId !== updatedById) recipientIds.add(c.authorId);
  });

  return Array.from(recipientIds);
}

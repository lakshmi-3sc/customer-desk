import { prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";

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

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  issueId?: string
) {
  try {
    return await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message: message.substring(0, 500),
        issueId,
      },
    });
  } catch (error) {
    console.error("[createNotification] Error:", error);
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
    // Get current user and ticket info
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
    });

    const ticket = await prisma.issue.findUnique({
      where: { id: ticketId },
      include: { client: true },
    });

    if (!currentUser || !ticket) {
      console.log("[getMentionableUsers] User or ticket not found");
      return [];
    }

    const is3SC = currentUser.role?.startsWith("THREESC_");
    console.log(`[getMentionableUsers] is3SC: ${is3SC}, clientId: ${ticket.clientId}`);

    // Get all 3SC users
    const threescUsers = await prisma.user.findMany({
      where: {
        role: {
          in: ["THREESC_ADMIN", "THREESC_LEAD", "THREESC_AGENT"],
        },
      },
    });
    console.log(`[getMentionableUsers] Found ${threescUsers.length} 3SC users`);

    // Get all users from the ticket's client
    const clientUsers = await prisma.user.findMany({
      where: {
        clientMembers: {
          some: {
            clientId: ticket.clientId,
          },
        },
      },
    });
    console.log(`[getMentionableUsers] Found ${clientUsers.length} client users for clientId: ${ticket.clientId}`);

    // Combine and deduplicate
    const userMap = new Map();
    [...clientUsers, ...threescUsers].forEach((user) => {
      if (!userMap.has(user.id)) {
        userMap.set(user.id, user);
      }
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
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
        select: {
          authorId: true,
        },
        distinct: ["authorId"],
      },
    },
  });

  if (!issue) return [];

  const recipientIds = new Set<string>();

  if (issue.assignedToId && issue.assignedToId !== updatedById) {
    recipientIds.add(issue.assignedToId);
  }
  if (issue.raisedById && issue.raisedById !== updatedById) {
    recipientIds.add(issue.raisedById);
  }
  if (issue.escalatedToId && issue.escalatedToId !== updatedById) {
    recipientIds.add(issue.escalatedToId);
  }

  issue.comments.forEach((c) => {
    if (c.authorId !== updatedById) {
      recipientIds.add(c.authorId);
    }
  });

  return Array.from(recipientIds);
}

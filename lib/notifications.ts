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

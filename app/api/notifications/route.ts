import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const role = currentUser.role;
    const is3SC = ["THREESC_ADMIN", "THREESC_LEAD", "THREESC_AGENT"].includes(role);

    // Fetch in-app notifications directly from Notification model
    const userNotifications = await prisma.notification.findMany({
      where: { userId: currentUser.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        issue: { select: { id: true, ticketKey: true, title: true } },
      },
    });

    // Scope issues: CLIENT_USER sees own, CLIENT_ADMIN sees client, 3SC sees all
    let issueWhere: any = {};
    if (role === "CLIENT_USER") {
      issueWhere.raisedById = currentUser.id;
    } else if (!is3SC) {
      const membership = await prisma.clientMember.findFirst({
        where: { userId: currentUser.id },
      });
      if (membership) issueWhere.clientId = membership.clientId;
    }

    // Fetch recent status/field changes (IssueHistory) made by someone ELSE on the user's issues
    const history = await prisma.issueHistory.findMany({
      where: {
        issue: issueWhere,
        NOT: { changedById: currentUser.id },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        changedBy: { select: { name: true } },
        issue: { select: { id: true, ticketKey: true, title: true } },
      },
    });

    // Fetch recent comments by others on the user's issues
    const comments = await prisma.comment.findMany({
      where: {
        issue: issueWhere,
        NOT: { authorId: currentUser.id },
        parentId: null, // top-level only for notifications
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        author: { select: { name: true } },
        issue: { select: { id: true, ticketKey: true, title: true } },
      },
    });

    // Build notification objects
    type Notif = {
      id: string;
      type: "status_change" | "field_change" | "comment" | "sla" | "NEW_COMMENT" | "ISSUE_ASSIGNED" | "STATUS_UPDATED" | "SLA_WARNING" | "ESCALATION" | "ISSUE_RESOLVED";
      title: string;
      body: string;
      issueKey: string | null;
      issueId: string;
      createdAt: string;
    };

    const notifications: Notif[] = [];

    // Add in-app notifications from Notification model
    for (const notif of userNotifications) {
      notifications.push({
        id: notif.id,
        type: notif.type as any,
        title: notif.title,
        body: notif.message,
        issueKey: notif.issue?.ticketKey ?? null,
        issueId: notif.issueId ?? notif.issue?.id ?? "",
        createdAt: notif.createdAt.toISOString(),
      });
    }

    for (const h of history) {
      if (h.fieldChanged === "status") {
        notifications.push({
          id: `hist-${h.id}`,
          type: "status_change",
          title: `Status updated on ${h.issue.ticketKey ?? h.issue.id}`,
          body: `${h.changedBy?.name ?? "An agent"} changed status to ${h.newValue ?? "Unknown"}`,
          issueKey: h.issue.ticketKey,
          issueId: h.issue.id,
          createdAt: h.createdAt.toISOString(),
        });
      } else {
        notifications.push({
          id: `hist-${h.id}`,
          type: "field_change",
          title: `Update on ${h.issue.ticketKey ?? h.issue.id}`,
          body: `${h.changedBy?.name ?? "An agent"} updated ${h.fieldChanged}${h.newValue ? ` to "${h.newValue}"` : ""}`,
          issueKey: h.issue.ticketKey,
          issueId: h.issue.id,
          createdAt: h.createdAt.toISOString(),
        });
      }
    }

    for (const c of comments) {
      notifications.push({
        id: `comment-${c.id}`,
        type: "comment",
        title: `New reply on ${c.issue.ticketKey ?? c.issue.id}`,
        body: `${c.author.name} replied: "${c.content.slice(0, 80)}${c.content.length > 80 ? "…" : ""}"`,
        issueKey: c.issue.ticketKey,
        issueId: c.issue.id,
        createdAt: c.createdAt.toISOString(),
      });
    }

    // Fetch SLA-breached/at-risk issues for SLA notifications
    const slaIssues = await prisma.issue.findMany({
      where: { ...issueWhere, OR: [{ slaBreached: true }, { slaBreachRisk: true }] },
      select: { id: true, ticketKey: true, title: true, slaBreached: true, slaBreachRisk: true, slaDueAt: true, updatedAt: true },
      take: 5,
    });

    for (const issue of slaIssues) {
      notifications.push({
        id: `sla-${issue.id}`,
        type: "sla",
        title: `SLA ${issue.slaBreached ? "breached" : "at risk"}: ${issue.ticketKey ?? issue.id}`,
        body: issue.slaBreached
          ? `Issue "${issue.title}" has exceeded its SLA resolution target.`
          : `Issue "${issue.title}" is approaching its SLA deadline.${issue.slaDueAt ? ` Due: ${new Date(issue.slaDueAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}`,
        issueKey: issue.ticketKey,
        issueId: issue.id,
        createdAt: issue.updatedAt.toISOString(),
      });
    }

    // Sort by createdAt desc
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ notifications: notifications.slice(0, 30), unreadCount: Math.min(notifications.length, 9) });
  } catch (error) {
    console.error("Notifications API error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

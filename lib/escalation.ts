import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { escalationEmail } from "@/lib/email-templates";

interface EscalationResult {
  issueId: string;
  ticketKey: string | null;
  rule: string;
  leadId: string;
}

// Find the best lead to escalate to for a given project
async function resolveEscalateTo(projectId: string | null): Promise<string | null> {
  // 1. Project's assigned lead
  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { assignedLead: true },
    });
    if (project?.assignedLead) return project.assignedLead;
  }

  // 2. Any active THREESC_LEAD
  const lead = await prisma.user.findFirst({
    where: { role: "THREESC_LEAD", isActive: true },
    select: { id: true },
  });
  if (lead) return lead.id;

  // 3. Fallback to THREESC_ADMIN
  const admin = await prisma.user.findFirst({
    where: { role: "THREESC_ADMIN", isActive: true },
    select: { id: true },
  });
  return admin?.id ?? null;
}

async function escalateIssue(
  issueId: string,
  leadId: string,
  reason: string,
  autoAssign: boolean,
) {
  const updateData: any = {
    escalated: true,
    escalatedAt: new Date(),
    escalatedToId: leadId,
  };

  if (autoAssign) {
    updateData.assignedToId = leadId;
  }

  const issue = await prisma.issue.update({
    where: { id: issueId },
    data: updateData,
    include: {
      client: { select: { name: true } },
      project: { select: { name: true } },
    },
  });

  // Audit trail
  const systemUser = await prisma.user.findFirst({
    where: { role: "THREESC_ADMIN", isActive: true },
    select: { id: true },
  });

  if (systemUser) {
    await prisma.issueHistory.create({
      data: {
        issueId,
        changedById: systemUser.id,
        fieldChanged: "escalated",
        oldValue: "false",
        newValue: reason,
      },
    });

    // Internal comment visible to team
    await prisma.comment.create({
      data: {
        issueId,
        authorId: systemUser.id,
        content: `🚨 Auto-escalated: ${reason}`,
        isInternal: true,
      },
    });
  }

  // In-app notification to the lead
  await createNotification(
    leadId,
    "ESCALATION",
    `Auto-escalated: ${issue.ticketKey ?? issueId.slice(0, 8)}`,
    reason,
    issueId,
  );

  // Email the lead
  const lead = await prisma.user.findUnique({
    where: { id: leadId },
    select: { email: true },
  });

  if (lead?.email) {
    const template = escalationEmail({
      ticketKey: issue.ticketKey ?? issueId.slice(0, 8),
      ticketId: issueId,
      title: issue.title,
      priority: issue.priority,
      escalatedByName: "Auto-Escalation System",
      clientName: issue.client.name,
    });
    await sendEmail({ to: lead.email, ...template });
  }

  return issue;
}

export async function runEscalationEngine(): Promise<EscalationResult[]> {
  const escalated: EscalationResult[] = [];
  const now = new Date();

  // ─── Rule 1: CRITICAL unassigned > 30 min ────────────────────────────
  const criticalUnassigned = await prisma.issue.findMany({
    where: {
      priority: "CRITICAL",
      assignedToId: null,
      escalated: false,
      status: { notIn: ["RESOLVED", "CLOSED"] },
      createdAt: { lte: new Date(now.getTime() - 30 * 60 * 1000) },
    },
    select: { id: true, ticketKey: true, projectId: true, title: true },
  });

  for (const issue of criticalUnassigned) {
    const leadId = await resolveEscalateTo(issue.projectId);
    if (!leadId) continue;
    await escalateIssue(
      issue.id,
      leadId,
      "CRITICAL ticket unassigned for more than 30 minutes",
      true, // auto-assign to lead
    );
    escalated.push({ issueId: issue.id, ticketKey: issue.ticketKey, rule: "CRITICAL_UNASSIGNED_30M", leadId });
  }

  // ─── Rule 2: HIGH unassigned > 2 hours ───────────────────────────────
  const highUnassigned = await prisma.issue.findMany({
    where: {
      priority: "HIGH",
      assignedToId: null,
      escalated: false,
      status: { notIn: ["RESOLVED", "CLOSED"] },
      createdAt: { lte: new Date(now.getTime() - 2 * 60 * 60 * 1000) },
    },
    select: { id: true, ticketKey: true, projectId: true, title: true },
  });

  for (const issue of highUnassigned) {
    const leadId = await resolveEscalateTo(issue.projectId);
    if (!leadId) continue;
    await escalateIssue(
      issue.id,
      leadId,
      "HIGH priority ticket unassigned for more than 2 hours",
      false,
    );
    escalated.push({ issueId: issue.id, ticketKey: issue.ticketKey, rule: "HIGH_UNASSIGNED_2H", leadId });
  }

  // ─── Rule 3: SLA breached, still open ────────────────────────────────
  const slaBreached = await prisma.issue.findMany({
    where: {
      slaBreached: true,
      escalated: false,
      status: { notIn: ["RESOLVED", "CLOSED"] },
    },
    select: { id: true, ticketKey: true, projectId: true, title: true },
  });

  for (const issue of slaBreached) {
    const leadId = await resolveEscalateTo(issue.projectId);
    if (!leadId) continue;
    await escalateIssue(
      issue.id,
      leadId,
      "SLA deadline breached — immediate attention required",
      false,
    );
    escalated.push({ issueId: issue.id, ticketKey: issue.ticketKey, rule: "SLA_BREACHED", leadId });
  }

  // ─── Rule 4: Stuck IN_PROGRESS > 48 hours ────────────────────────────
  const stuckInProgress = await prisma.issue.findMany({
    where: {
      status: "IN_PROGRESS",
      escalated: false,
      updatedAt: { lte: new Date(now.getTime() - 48 * 60 * 60 * 1000) },
    },
    select: { id: true, ticketKey: true, projectId: true, title: true },
  });

  for (const issue of stuckInProgress) {
    const leadId = await resolveEscalateTo(issue.projectId);
    if (!leadId) continue;
    await escalateIssue(
      issue.id,
      leadId,
      "Ticket stuck in IN_PROGRESS for more than 48 hours",
      false,
    );
    escalated.push({ issueId: issue.id, ticketKey: issue.ticketKey, rule: "STUCK_48H", leadId });
  }

  // ─── Rule 5: Systemic — same client, same category, 3+ in 7 days ─────
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const recentTickets = await prisma.issue.groupBy({
    by: ["clientId", "category"],
    where: {
      createdAt: { gte: sevenDaysAgo },
      escalated: false,
      status: { notIn: ["RESOLVED", "CLOSED"] },
    },
    _count: { id: true },
    having: { id: { _count: { gte: 3 } } },
  });

  for (const group of recentTickets) {
    // Get the most recent ticket of this pattern to escalate
    const representative = await prisma.issue.findFirst({
      where: {
        clientId: group.clientId,
        category: group.category,
        escalated: false,
        status: { notIn: ["RESOLVED", "CLOSED"] },
        createdAt: { gte: sevenDaysAgo },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, ticketKey: true, projectId: true },
    });

    if (!representative) continue;

    const leadId = await resolveEscalateTo(representative.projectId);
    if (!leadId) continue;

    await escalateIssue(
      representative.id,
      leadId,
      `Systemic issue: ${group._count.id} ${group.category.replace(/_/g, " ")} tickets from the same customer in 7 days`,
      false,
    );
    escalated.push({
      issueId: representative.id,
      ticketKey: representative.ticketKey,
      rule: "SYSTEMIC_PATTERN",
      leadId,
    });
  }

  return escalated;
}

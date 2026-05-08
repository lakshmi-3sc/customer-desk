const BASE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

const BRAND_COLOR = "#0052CC";

function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>3SC Connect</title>
</head>
<body style="margin:0;padding:0;background:#F8F9FB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F9FB;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #E2E8F0;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:${BRAND_COLOR};padding:20px 28px;">
              <span style="color:#ffffff;font-size:16px;font-weight:700;letter-spacing:-0.3px;">3SC Connect</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 28px;border-top:1px solid #F1F5F9;">
              <p style="margin:0;font-size:11px;color:#94A3B8;">
                You received this because you are part of 3SC Connect.
                <a href="${BASE_URL}" style="color:${BRAND_COLOR};text-decoration:none;">Visit portal</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ticketLink(ticketKey: string, ticketId: string) {
  const key = ticketKey || ticketId;
  return `${BASE_URL}/tickets/${key}`;
}

function priorityBadge(priority: string): string {
  const colors: Record<string, string> = {
    CRITICAL: "#EF4444",
    HIGH: "#F59E0B",
    MEDIUM: "#3B82F6",
    LOW: "#94A3B8",
  };
  const bg: Record<string, string> = {
    CRITICAL: "#FEF2F2",
    HIGH: "#FFFBEB",
    MEDIUM: "#EFF6FF",
    LOW: "#F8FAFC",
  };
  const color = colors[priority] ?? "#94A3B8";
  const bgColor = bg[priority] ?? "#F8FAFC";
  return `<span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;color:${color};background:${bgColor};border:1px solid ${color}22;">${priority}</span>`;
}

function ctaButton(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;margin-top:20px;padding:10px 20px;background:${BRAND_COLOR};color:#ffffff;font-size:13px;font-weight:600;border-radius:8px;text-decoration:none;">${label}</a>`;
}

function metaRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:4px 0;font-size:12px;color:#64748B;width:120px;vertical-align:top;">${label}</td>
    <td style="padding:4px 0;font-size:12px;color:#1E293B;font-weight:500;">${value}</td>
  </tr>`;
}

// ─── Template functions ────────────────────────────────────────────────────

export function ticketCreatedEmail(params: {
  ticketKey: string;
  ticketId: string;
  title: string;
  priority: string;
  category: string;
  project: string;
  raisedBy: string;
  clientName: string;
}) {
  const link = ticketLink(params.ticketKey, params.ticketId);
  return {
    subject: `[${params.ticketKey}] New ticket raised — ${params.title}`,
    html: layout(`
      <p style="margin:0 0 4px;font-size:13px;color:#64748B;">New ticket raised by <strong>${params.raisedBy}</strong> (${params.clientName})</p>
      <h2 style="margin:8px 0 16px;font-size:18px;color:#0F172A;font-weight:700;">${params.title}</h2>
      <table cellpadding="0" cellspacing="0">
        ${metaRow("Ticket", params.ticketKey)}
        ${metaRow("Priority", priorityBadge(params.priority))}
        ${metaRow("Category", params.category.replace(/_/g, " "))}
        ${metaRow("Project", params.project)}
      </table>
      ${ctaButton("View Ticket →", link)}
    `),
  };
}

export function ticketAssignedEmail(params: {
  ticketKey: string;
  ticketId: string;
  title: string;
  priority: string;
  assignedToName: string;
  assignedByName: string;
}) {
  const link = ticketLink(params.ticketKey, params.ticketId);
  return {
    subject: `[${params.ticketKey}] Ticket assigned to you — ${params.title}`,
    html: layout(`
      <p style="margin:0 0 4px;font-size:13px;color:#64748B;"><strong>${params.assignedByName}</strong> assigned a ticket to you</p>
      <h2 style="margin:8px 0 16px;font-size:18px;color:#0F172A;font-weight:700;">${params.title}</h2>
      <table cellpadding="0" cellspacing="0">
        ${metaRow("Ticket", params.ticketKey)}
        ${metaRow("Priority", priorityBadge(params.priority))}
      </table>
      ${ctaButton("View & Respond →", link)}
    `),
  };
}

export function statusChangedEmail(params: {
  ticketKey: string;
  ticketId: string;
  title: string;
  fromStatus: string;
  toStatus: string;
  changedByName: string;
}) {
  const link = ticketLink(params.ticketKey, params.ticketId);
  const fmt = (s: string) => s.replace(/_/g, " ");
  const isResolved = params.toStatus === "RESOLVED" || params.toStatus === "CLOSED";
  return {
    subject: `[${params.ticketKey}] Status updated to ${fmt(params.toStatus)} — ${params.title}`,
    html: layout(`
      <p style="margin:0 0 4px;font-size:13px;color:#64748B;">
        <strong>${params.changedByName}</strong> updated the ticket status
      </p>
      <h2 style="margin:8px 0 16px;font-size:18px;color:#0F172A;font-weight:700;">${params.title}</h2>
      <table cellpadding="0" cellspacing="0">
        ${metaRow("Ticket", params.ticketKey)}
        ${metaRow("Change", `${fmt(params.fromStatus)} → <strong>${fmt(params.toStatus)}</strong>`)}
      </table>
      ${isResolved
        ? `<div style="margin-top:16px;padding:12px 16px;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;">
            <p style="margin:0;font-size:13px;color:#166534;">✓ This ticket has been resolved. Please confirm if the issue is fixed.</p>
           </div>`
        : ""}
      ${ctaButton("View Ticket →", link)}
    `),
  };
}

export function newCommentEmail(params: {
  ticketKey: string;
  ticketId: string;
  title: string;
  commentPreview: string;
  authorName: string;
  isMention: boolean;
}) {
  const link = ticketLink(params.ticketKey, params.ticketId);
  const headline = params.isMention
    ? `<strong>${params.authorName}</strong> mentioned you in a comment`
    : `<strong>${params.authorName}</strong> added a comment`;
  return {
    subject: `[${params.ticketKey}] ${params.isMention ? `${params.authorName} mentioned you` : "New comment"} — ${params.title}`,
    html: layout(`
      <p style="margin:0 0 12px;font-size:13px;color:#64748B;">${headline}</p>
      <h2 style="margin:0 0 16px;font-size:16px;color:#0F172A;font-weight:700;">${params.title}</h2>
      <div style="padding:12px 16px;background:#F8FAFC;border-left:3px solid ${BRAND_COLOR};border-radius:0 8px 8px 0;font-size:13px;color:#334155;line-height:1.6;">
        ${params.commentPreview}
      </div>
      ${ctaButton("Reply →", link)}
    `),
  };
}

export function slaWarningEmail(params: {
  ticketKey: string;
  ticketId: string;
  title: string;
  priority: string;
  slaDueAt: Date;
  clientName: string;
}) {
  const link = ticketLink(params.ticketKey, params.ticketId);
  const hoursLeft = Math.max(0, Math.round((params.slaDueAt.getTime() - Date.now()) / 3600000));
  return {
    subject: `⚠ SLA at risk — [${params.ticketKey}] ${params.title}`,
    html: layout(`
      <div style="padding:10px 14px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;margin-bottom:16px;">
        <p style="margin:0;font-size:13px;color:#92400E;font-weight:600;">⚠ SLA due in ~${hoursLeft}h — action required</p>
      </div>
      <h2 style="margin:0 0 16px;font-size:18px;color:#0F172A;font-weight:700;">${params.title}</h2>
      <table cellpadding="0" cellspacing="0">
        ${metaRow("Ticket", params.ticketKey)}
        ${metaRow("Priority", priorityBadge(params.priority))}
        ${metaRow("Customer", params.clientName)}
        ${metaRow("SLA Due", params.slaDueAt.toUTCString())}
      </table>
      ${ctaButton("Resolve Now →", link)}
    `),
  };
}

export function escalationEmail(params: {
  ticketKey: string;
  ticketId: string;
  title: string;
  priority: string;
  escalatedByName: string;
  clientName: string;
}) {
  const link = ticketLink(params.ticketKey, params.ticketId);
  return {
    subject: `🚨 Escalation — [${params.ticketKey}] ${params.title}`,
    html: layout(`
      <div style="padding:10px 14px;background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;margin-bottom:16px;">
        <p style="margin:0;font-size:13px;color:#991B1B;font-weight:600;">🚨 This ticket has been escalated to you</p>
      </div>
      <h2 style="margin:0 0 16px;font-size:18px;color:#0F172A;font-weight:700;">${params.title}</h2>
      <table cellpadding="0" cellspacing="0">
        ${metaRow("Ticket", params.ticketKey)}
        ${metaRow("Priority", priorityBadge(params.priority))}
        ${metaRow("Customer", params.clientName)}
        ${metaRow("Escalated by", params.escalatedByName)}
      </table>
      ${ctaButton("Review Escalation →", link)}
    `),
  };
}

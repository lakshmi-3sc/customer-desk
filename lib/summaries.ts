import { prisma } from "@/lib/prisma";
import { SummaryType, IssueStatus } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";

export interface InternalMetrics {
  totalOpen: number;
  resolved: number;
  slaBreaches: number;
  escalations: number;
  avgResolutionHours: number;
  csatScore: number;
  agentPerformance: {
    id: string;
    name: string;
    assigned: number;
    resolved: number;
    avgResponseHours: number;
  }[];
  topClients: {
    id: string;
    name: string;
    openIssues: number;
    resolvedThisPeriod: number;
  }[];
}

export interface ClientMetrics {
  totalSubmitted: number;
  resolved: number;
  completionRate: number;
  slaStatus: string;
  openIssues: number;
  recentlyResolved: {
    id: string;
    title: string;
    resolvedAt: string;
  }[];
  issuesByCategory: {
    category: string;
    count: number;
  }[];
}

/**
 * Generate internal summary metrics for 3SC team
 */
export async function generateInternalSummary(
  startDate: Date,
  endDate: Date,
  summaryType: SummaryType
): Promise<InternalMetrics> {
  const [
    openIssues,
    resolvedIssues,
    slaBreaches,
    escalations,
    agentStats,
    clientStats,
  ] = await Promise.all([
    // Open issues
    prisma.issue.findMany({
      where: {
        status: { in: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"] as IssueStatus[] },
      },
      select: { id: true },
    }),

    // Issues resolved in this period
    prisma.issue.findMany({
      where: {
        status: { in: ["RESOLVED", "CLOSED"] as IssueStatus[] },
        resolvedAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        createdAt: true,
        resolvedAt: true,
      },
    }),

    // SLA breaches
    prisma.issue.findMany({
      where: {
        slaBreached: true,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { id: true },
    }),

    // Escalations in period
    prisma.issue.findMany({
      where: {
        escalated: true,
        escalatedAt: { gte: startDate, lte: endDate },
      },
      select: { id: true },
    }),

    // Agent performance stats
    prisma.user.findMany({
      where: {
        role: "THREESC_AGENT",
      },
      select: {
        id: true,
        name: true,
        assignedIssues: {
          where: {
            createdAt: { gte: startDate, lte: endDate },
          },
          select: { id: true },
        },
      },
    }),

    // Clients with issues
    prisma.client.findMany({
      where: {
        issues: {
          some: {
            createdAt: { gte: startDate, lte: endDate },
          },
        },
      },
      select: {
        id: true,
        name: true,
        issues: {
          where: {
            createdAt: { gte: startDate, lte: endDate },
          },
          select: {
            id: true,
            status: true,
          },
        },
      },
      take: 10,
    }),
  ]);

  // Calculate average resolution time
  const resolutionTimes = resolvedIssues
    .filter((issue) => issue.resolvedAt)
    .map((issue) => {
      const resolvedTime = new Date(issue.resolvedAt!).getTime();
      const createdTime = new Date(issue.createdAt).getTime();
      return (resolvedTime - createdTime) / (1000 * 60 * 60); // hours
    });

  const avgResolutionHours =
    resolutionTimes.length > 0
      ? Math.round(
          resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
        )
      : 0;

  // Calculate agent performance
  const agentPerformance = agentStats.map((agent) => ({
    id: agent.id,
    name: agent.name,
    assigned: agent.assignedIssues.length,
    resolved: 0, // Would need additional query
    avgResponseHours: 4, // Placeholder
  }));

  // Process top clients
  const topClients = clientStats.map((client) => ({
    id: client.id,
    name: client.name,
    openIssues: client.issues.filter(
      (i) =>
        i.status === "OPEN" ||
        i.status === "ACKNOWLEDGED" ||
        i.status === "IN_PROGRESS"
    ).length,
    resolvedThisPeriod: client.issues.filter(
      (i) => i.status === "RESOLVED" || i.status === "CLOSED"
    ).length,
  }));

  return {
    totalOpen: openIssues.length,
    resolved: resolvedIssues.length,
    slaBreaches: slaBreaches.length,
    escalations: escalations.length,
    avgResolutionHours,
    csatScore: 92, // Placeholder - would come from CSAT data
    agentPerformance,
    topClients,
  };
}

/**
 * Generate client-facing summary metrics
 */
export async function generateClientSummary(
  clientId: string,
  startDate: Date,
  endDate: Date,
  summaryType: SummaryType
): Promise<ClientMetrics> {
  const [issues, categories] = await Promise.all([
    // Client issues in period
    prisma.issue.findMany({
      where: {
        clientId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        title: true,
        status: true,
        category: true,
        resolvedAt: true,
        slaBreached: true,
      },
      orderBy: { resolvedAt: "desc" },
    }),

    // Issue categories
    prisma.issue.findMany({
      where: { clientId },
      select: { category: true },
    }),
  ]);

  const totalSubmitted = issues.length;
  const resolved = issues.filter(
    (i) => i.status === "RESOLVED" || i.status === "CLOSED"
  ).length;
  const completionRate =
    totalSubmitted > 0 ? Math.round((resolved / totalSubmitted) * 100) : 0;
  const slaBreaches = issues.filter((i) => i.slaBreached).length;

  // Group by category
  const categoryMap: Record<string, number> = {};
  categories.forEach((issue) => {
    const cat = issue.category || "UNCATEGORIZED";
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  });

  const issuesByCategory = Object.entries(categoryMap).map(
    ([category, count]) => ({
      category,
      count,
    })
  );

  // Recently resolved issues
  const recentlyResolved = issues
    .filter((i) => (i.status === "RESOLVED" || i.status === "CLOSED") && i.resolvedAt)
    .slice(0, 5)
    .map((i) => ({
      id: i.id,
      title: i.title,
      resolvedAt: i.resolvedAt!.toISOString(),
    }));

  // Count open issues
  const openIssues = issues.filter(
    (i) =>
      i.status === "OPEN" ||
      i.status === "ACKNOWLEDGED" ||
      i.status === "IN_PROGRESS"
  ).length;

  return {
    totalSubmitted,
    resolved,
    completionRate,
    slaStatus:
      slaBreaches === 0
        ? "All SLAs Met ✓"
        : `${slaBreaches} SLA Breach${slaBreaches > 1 ? "es" : ""}`,
    openIssues,
    recentlyResolved,
    issuesByCategory,
  };
}

/**
 * Render HTML template for internal summary email
 */
export function renderInternalSummaryHTML(
  metrics: InternalMetrics,
  summaryType: SummaryType,
  periodStart: Date,
  periodEnd: Date
): string {
  const period =
    summaryType === "WEEKLY"
      ? `Week of ${periodStart.toLocaleDateString()}`
      : `${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; color: #333; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(to right, #0052CC, #0747A6); color: white; padding: 30px; border-radius: 8px; margin-bottom: 30px; }
    .header h1 { margin: 0; font-size: 28px; }
    .header p { margin: 5px 0 0 0; opacity: 0.9; }
    .metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
    .metric-card { background: #f5f5f5; padding: 20px; border-radius: 8px; border-left: 4px solid #0052CC; }
    .metric-label { font-size: 12px; text-transform: uppercase; color: #666; margin-bottom: 8px; }
    .metric-value { font-size: 32px; font-weight: bold; color: #0052CC; }
    .metric-unit { font-size: 14px; color: #999; margin-left: 5px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #f5f5f5; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #ddd; }
    td { padding: 12px; border-bottom: 1px solid #eee; }
    tr:hover { background: #f9f9f9; }
    .footer { text-align: center; color: #999; font-size: 12px; padding-top: 20px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 ${summaryType === "WEEKLY" ? "Weekly" : "Monthly"} Summary</h1>
      <p>${period}</p>
    </div>

    <div class="metrics">
      <div class="metric-card">
        <div class="metric-label">Total Open Issues</div>
        <div class="metric-value">${metrics.totalOpen}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Resolved This Period</div>
        <div class="metric-value">${metrics.resolved}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">SLA Breaches</div>
        <div class="metric-value">${metrics.slaBreaches}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Escalations</div>
        <div class="metric-value">${metrics.escalations}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Avg Resolution Time</div>
        <div class="metric-value">${metrics.avgResolutionHours}<span class="metric-unit">hours</span></div>
      </div>
      <div class="metric-card">
        <div class="metric-label">CSAT Score</div>
        <div class="metric-value">${metrics.csatScore}<span class="metric-unit">%</span></div>
      </div>
    </div>

    <h2>📈 Agent Performance</h2>
    <table>
      <thead>
        <tr>
          <th>Agent</th>
          <th>Assigned</th>
          <th>Resolved</th>
          <th>Avg Response Time</th>
        </tr>
      </thead>
      <tbody>
        ${metrics.agentPerformance
          .map(
            (agent) => `
          <tr>
            <td>${agent.name}</td>
            <td>${agent.assigned}</td>
            <td>${agent.resolved}</td>
            <td>${agent.avgResponseHours}h</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>

    <h2>👥 Top Clients</h2>
    <table>
      <thead>
        <tr>
          <th>Client</th>
          <th>Open Issues</th>
          <th>Resolved</th>
        </tr>
      </thead>
      <tbody>
        ${metrics.topClients
          .map(
            (client) => `
          <tr>
            <td>${client.name}</td>
            <td>${client.openIssues}</td>
            <td>${client.resolvedThisPeriod}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>

    <div class="footer">
      <p>This is an automated ${summaryType.toLowerCase()} summary report. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Render HTML template for client-facing summary email
 */
export function renderClientSummaryHTML(
  clientName: string,
  metrics: ClientMetrics,
  summaryType: SummaryType,
  periodStart: Date,
  periodEnd: Date
): string {
  const period =
    summaryType === "WEEKLY"
      ? `Week of ${periodStart.toLocaleDateString()}`
      : `${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; color: #333; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(to right, #0052CC, #0747A6); color: white; padding: 30px; border-radius: 8px; margin-bottom: 30px; }
    .header h1 { margin: 0; font-size: 28px; }
    .header p { margin: 5px 0 0 0; opacity: 0.9; }
    .metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
    .metric-card { background: #f5f5f5; padding: 20px; border-radius: 8px; border-left: 4px solid #0052CC; }
    .metric-card.success { border-left-color: #10b981; }
    .metric-card.warning { border-left-color: #f59e0b; }
    .metric-label { font-size: 12px; text-transform: uppercase; color: #666; margin-bottom: 8px; }
    .metric-value { font-size: 32px; font-weight: bold; color: #0052CC; }
    .metric-card.success .metric-value { color: #10b981; }
    .metric-card.warning .metric-value { color: #f59e0b; }
    .metric-unit { font-size: 14px; color: #999; margin-left: 5px; }
    .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
    .alert.success { background: #d1fae5; border-left-color: #10b981; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #f5f5f5; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #ddd; }
    td { padding: 12px; border-bottom: 1px solid #eee; }
    tr:hover { background: #f9f9f9; }
    .footer { text-align: center; color: #999; font-size: 12px; padding-top: 20px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 ${summaryType === "WEEKLY" ? "Weekly" : "Monthly"} Status Report</h1>
      <p>${period}</p>
    </div>

    ${
      metrics.slaStatus.includes("SLA Breach")
        ? `<div class="alert warning">⚠️ <strong>${metrics.slaStatus}</strong></div>`
        : `<div class="alert success">✓ ${metrics.slaStatus}</div>`
    }

    <div class="metrics">
      <div class="metric-card">
        <div class="metric-label">Total Submitted</div>
        <div class="metric-value">${metrics.totalSubmitted}</div>
      </div>
      <div class="metric-card success">
        <div class="metric-label">Resolved</div>
        <div class="metric-value">${metrics.resolved}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Completion Rate</div>
        <div class="metric-value">${metrics.completionRate}<span class="metric-unit">%</span></div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Currently Open</div>
        <div class="metric-value">${metrics.openIssues}</div>
      </div>
    </div>

    ${
      metrics.recentlyResolved.length > 0
        ? `
    <h2>✅ Recently Resolved Issues</h2>
    <table>
      <thead>
        <tr>
          <th>Issue</th>
          <th>Resolved Date</th>
        </tr>
      </thead>
      <tbody>
        ${metrics.recentlyResolved
          .map(
            (issue) => `
        <tr>
          <td>${issue.title}</td>
          <td>${new Date(issue.resolvedAt).toLocaleDateString()}</td>
        </tr>
      `
          )
          .join("")}
      </tbody>
    </table>
    `
        : ""
    }

    ${
      metrics.issuesByCategory.length > 0
        ? `
    <h2>📋 Issues by Category</h2>
    <table>
      <thead>
        <tr>
          <th>Category</th>
          <th>Count</th>
        </tr>
      </thead>
      <tbody>
        ${metrics.issuesByCategory
          .map(
            (cat) => `
        <tr>
          <td>${cat.category}</td>
          <td>${cat.count}</td>
        </tr>
      `
          )
          .join("")}
      </tbody>
    </table>
    `
        : ""
    }

    <div class="footer">
      <p>This is an automated ${summaryType.toLowerCase()} summary report from ${clientName}. For questions or concerns, please contact our support team.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

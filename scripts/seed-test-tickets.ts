/**
 * Seed Test Tickets for Escalation System & Dashboard Validation
 *
 * Creates 20 realistic tickets across 4 groups to test:
 *  - Escalation page (3SC Lead dashboard)
 *  - Admin live activity feed
 *  - SLA breach indicators
 *  - Auto-escalation cron rules
 *
 * How to run:
 *   npx tsx scripts/seed-test-tickets.ts
 *
 * Or with ts-node:
 *   npx ts-node --project tsconfig.json scripts/seed-test-tickets.ts
 */

import { PrismaClient, IssueCategory, IssuePriority, IssueStatus } from '@prisma/client';

const prisma = new PrismaClient();

const now = new Date();
const minsAgo = (m: number) => new Date(now.getTime() - m * 60 * 1000);
const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000);
const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

async function main() {
  console.log('🔍 Fetching existing users, clients, and projects from DB...');

  // Find required user roles
  const lead = await prisma.user.findFirst({ where: { role: 'THREESC_LEAD', isActive: true } });
  const admin = await prisma.user.findFirst({ where: { role: 'THREESC_ADMIN', isActive: true } });
  const agents = await prisma.user.findMany({ where: { role: 'THREESC_AGENT', isActive: true } });

  if (!lead) throw new Error('No THREESC_LEAD user found. Run the main seed first.');
  if (!admin) throw new Error('No THREESC_ADMIN user found. Run the main seed first.');

  const agent = agents[0] ?? lead; // fallback if no agent

  console.log(`  Lead:  ${lead.name} (${lead.id})`);
  console.log(`  Admin: ${admin.name} (${admin.id})`);
  console.log(`  Agent: ${agent.name} (${agent.id})`);

  await prisma.client.upsert({
    where: { id: 'client_sp_global_001' },
    update: { name: 'S&P Global', industry: 'Financial Services', isActive: true },
    create: {
      id: 'client_sp_global_001',
      name: 'S&P Global',
      industry: 'Financial Services',
      isActive: true,
    },
  });

  // Find clients
  const clients = await prisma.client.findMany({ where: { isActive: true } });
  if (clients.length === 0) throw new Error('No active clients found. Run the main seed first.');

  // Find client users (raisedBy)
  const clientUsers: Record<string, string> = {};
  for (const client of clients) {
    const member = await prisma.clientMember.findFirst({
      where: { clientId: client.id },
      include: { user: true },
    });
    if (member) clientUsers[client.id] = member.userId;
  }

  // Find projects (may be empty)
  const projects = await prisma.project.findMany({ where: { status: 'ACTIVE' }, take: 5 });
  const projectFor = (clientId: string): string | undefined =>
    projects.find((p) => p.clientId === clientId)?.id;

  const clientByName = (name: string) =>
    clients.find((client) => client.name.toLowerCase().includes(name.toLowerCase()));

  const clientForTitle = (title: string) => {
    const normalizedTitle = title.toLowerCase();
    const matchedClient =
      normalizedTitle.includes('vip industries')
        ? clientByName('VIP Industries')
        : normalizedTitle.includes('colgate')
          ? clientByName('Colgate-Palmolive') ?? clientByName('Colgate')
          : normalizedTitle.includes('bsv bio sciences')
            ? clientByName('BSV Bio Sciences')
            : normalizedTitle.includes('s&p global')
              ? clientByName('S&P Global')
              : normalizedTitle.includes('modenik')
                ? clientByName('Modenik')
                : undefined;

    if (!matchedClient) {
      throw new Error(`No matching client found for test ticket title: ${title}`);
    }

    return matchedClient;
  };
  const raisedBy = (clientId: string) => clientUsers[clientId] ?? admin.id;

  console.log(`\n✅ Found ${clients.length} clients, ${agents.length} agents, ${projects.length} projects`);
  console.log('📝 Creating test tickets...\n');

  // ─────────────────────────────────────────────────────────────────────────
  // GROUP A — Already escalated (5 tickets)
  // These appear on the 3SC Lead escalations page immediately
  // ─────────────────────────────────────────────────────────────────────────
  console.log('GROUP A: Already escalated tickets...');

  const groupA = [
    {
      title: 'Colgate ERP: Production batch records missing from SAP S/4HANA',
      description:
        'Production batch records for SKUs CG-PF-001 through CG-PF-045 are not syncing from the manufacturing floor system to SAP S/4HANA. Approximately 2,000 batch records are missing, causing downstream issues with quality checks and shipment clearance.',
      category: 'DATA_ACCURACY' as IssueCategory,
      priority: 'CRITICAL' as IssuePriority,
      status: 'IN_PROGRESS' as IssueStatus,
      escalatedAt: hoursAgo(3),
      slaBreached: true,
      slaDueAt: hoursAgo(1),
      assignedToId: agent.id,
      escalationReason: 'CRITICAL ticket unassigned for more than 30 minutes',
    },
    {
      title: 'VIP Industries: Luggage inventory counts diverging between WMS and Salesforce',
      description:
        'Inventory quantities for the VIP Skybags range show a 15% discrepancy between the WMS (Manhattan Associates) and Salesforce CRM. Sales reps are quoting incorrect stock levels to retail partners, resulting in order cancellations.',
      category: 'DATA_ACCURACY' as IssueCategory,
      priority: 'HIGH' as IssuePriority,
      status: 'ACKNOWLEDGED' as IssueStatus,
      escalatedAt: hoursAgo(5),
      slaBreached: false,
      slaDueAt: hoursAgo(0.5),
      assignedToId: agent.id,
      escalationReason: 'HIGH priority ticket unassigned for more than 2 hours',
    },
    {
      title: 'BSV Bio Sciences: Cold-chain temperature alerts not triggering in monitoring dashboard',
      description:
        'Temperature excursion alerts for warehouse zones WH-B and WH-C are not generating notifications in the cold-chain monitoring dashboard. Two batches of injectable APIs may have been compromised. Regulatory audit scheduled next week.',
      category: 'BUG' as IssueCategory,
      priority: 'CRITICAL' as IssuePriority,
      status: 'OPEN' as IssueStatus,
      escalatedAt: hoursAgo(2),
      slaBreached: true,
      slaDueAt: hoursAgo(2),
      assignedToId: lead.id,
      escalationReason: 'SLA deadline breached — immediate attention required',
    },
    {
      title: 'S&P Global: Market data feed latency exceeding 500ms threshold',
      description:
        'Real-time market data feed for Indian equities (NSE/BSE) is experiencing latency spikes of 600-900ms, well above the contracted 500ms SLA. Trading desks are unable to execute high-frequency strategies. Issue started after last night infrastructure maintenance.',
      category: 'PERFORMANCE' as IssueCategory,
      priority: 'CRITICAL' as IssuePriority,
      status: 'IN_PROGRESS' as IssueStatus,
      escalatedAt: hoursAgo(1),
      slaBreached: true,
      slaDueAt: hoursAgo(3),
      assignedToId: agent.id,
      escalationReason: 'Ticket stuck in IN_PROGRESS for more than 48 hours',
    },
    {
      title: 'Colgate CRM: Role-based access control bypass for dealer portal',
      description:
        'Dealer users in the Colgate distributor portal can access pricing tiers and margin data belonging to other dealers. This is a critical data confidentiality issue. Confirmed on three separate dealer accounts in the Gujarat region.',
      category: 'ACCESS_SECURITY' as IssueCategory,
      priority: 'HIGH' as IssuePriority,
      status: 'ACKNOWLEDGED' as IssueStatus,
      escalatedAt: hoursAgo(4),
      slaBreached: false,
      slaDueAt: hoursAgo(0.25),
      assignedToId: agent.id,
      escalationReason: 'Manual escalation: Security vulnerability with regulatory implications — dealer data exposed',
    },
  ];

  for (let i = 0; i < groupA.length; i++) {
    const t = groupA[i];
    const client = clientForTitle(t.title);
    const projId = projectFor(client.id);

    const issue = await prisma.issue.create({
      data: {
        title: t.title,
        description: t.description,
        category: t.category,
        priority: t.priority,
        status: t.status,
        clientId: client.id,
        projectId: projId,
        raisedById: raisedBy(client.id),
        assignedToId: t.assignedToId,
        escalated: true,
        escalatedAt: t.escalatedAt,
        escalatedToId: lead.id,
        slaBreached: t.slaBreached,
        slaDueAt: t.slaDueAt,
        createdAt: hoursAgo(6 + i),
        updatedAt: t.escalatedAt,
      },
    });

    // IssueHistory: ESCALATED entry (fieldChanged = "escalated")
    // The lead escalations route reads history[0].newValue as escalationReason
    // and history[0].changedBy.name as escalatedByName
    await prisma.issueHistory.create({
      data: {
        issueId: issue.id,
        changedById: admin.id, // system/admin = auto-escalation
        fieldChanged: 'escalated',
        oldValue: 'false',
        newValue: t.escalationReason,
        createdAt: t.escalatedAt,
      },
    });

    // Status change history entry for activity feed
    await prisma.issueHistory.create({
      data: {
        issueId: issue.id,
        changedById: agent.id,
        fieldChanged: 'status',
        oldValue: 'OPEN',
        newValue: t.status,
        createdAt: hoursAgo(5 + i),
      },
    });

    console.log(`  [A${i + 1}] Created: ${issue.id.slice(0, 8)}… — ${t.title.substring(0, 55)}...`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GROUP B — Needs escalation (will be picked up by /api/cron/escalate)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nGROUP B: Tickets that need escalation (cron targets)...');

  const groupB = [
    // Rule 1: CRITICAL unassigned > 30 minutes
    {
      title: 'VIP Industries: Skybag e-commerce checkout API returning 500 errors',
      description:
        'The checkout API endpoint /api/v2/orders/create is returning HTTP 500 for all Skybag product variants on the Flipkart integration. Approximately 300 orders have failed in the last 45 minutes. Revenue impact is approximately ₹12 lakhs.',
      category: 'BUG' as IssueCategory,
      priority: 'CRITICAL' as IssuePriority,
      status: 'OPEN' as IssueStatus,
      assignedToId: null,
      slaBreached: false,
      createdAt: minsAgo(45),
      updatedAt: minsAgo(45),
      slaDueAt: minsAgo(15),
      slaBreachRisk: true,
    },
    // Rule 2: HIGH unassigned > 2 hours
    {
      title: 'BSV Bio Sciences: Batch release module failing digital signature validation',
      description:
        'The batch release module in the QMS is rejecting all digital signatures from QA managers since the certificate renewal last night. Batches cannot be formally released without this sign-off. Six batches are pending release for dispatch.',
      category: 'BUG' as IssueCategory,
      priority: 'HIGH' as IssuePriority,
      status: 'OPEN' as IssueStatus,
      assignedToId: null,
      slaBreached: false,
      createdAt: hoursAgo(3),
      updatedAt: hoursAgo(3),
      slaDueAt: hoursAgo(1),
      slaBreachRisk: false,
    },
    // Rule 3: SLA breached, still open (not yet escalated)
    {
      title: 'Colgate: GST reconciliation report showing incorrect ITC values',
      description:
        'The monthly GST reconciliation report (GSTR-2B vs books) is showing Input Tax Credit values that are ₹4.2 crore lower than the actual ledger. Finance team cannot file the return. Deadline is in 48 hours.',
      category: 'DATA_ACCURACY' as IssueCategory,
      priority: 'HIGH' as IssuePriority,
      status: 'ACKNOWLEDGED' as IssueStatus,
      assignedToId: agent.id,
      slaBreached: true,
      createdAt: daysAgo(2),
      updatedAt: daysAgo(1),
      slaDueAt: hoursAgo(6),
      slaBreachRisk: false,
    },
    // Rule 4: Stuck IN_PROGRESS > 48 hours
    {
      title: 'S&P Global: Historical returns data backfill not completing for Indian mutual funds',
      description:
        'A data backfill job to populate 5-year historical returns for Indian equity mutual funds has been running in IN_PROGRESS state for 73 hours. The job shows no progress. Client reporting dashboards are showing incomplete NAV history.',
      category: 'DATA_ACCURACY' as IssueCategory,
      priority: 'MEDIUM' as IssuePriority,
      status: 'IN_PROGRESS' as IssueStatus,
      assignedToId: agent.id,
      slaBreached: false,
      createdAt: daysAgo(4),
      updatedAt: daysAgo(3),
      slaDueAt: daysAgo(1),
      slaBreachRisk: false,
    },
    // Rule 3 again: Another SLA breach (different category, different client)
    {
      title: 'VIP Industries: Supply chain visibility portal login failure for distribution partners',
      description:
        'Distribution partners across 12 states cannot log in to the supply chain visibility portal since the SSO migration on Tuesday. This is blocking order confirmations and dispatch acknowledgements across the entire distribution network.',
      category: 'ACCESS_SECURITY' as IssueCategory,
      priority: 'HIGH' as IssuePriority,
      status: 'OPEN' as IssueStatus,
      assignedToId: null,
      slaBreached: true,
      createdAt: daysAgo(2),
      updatedAt: hoursAgo(8),
      slaDueAt: hoursAgo(12),
      slaBreachRisk: false,
    },
  ];

  for (let i = 0; i < groupB.length; i++) {
    const t = groupB[i];
    const client = clientForTitle(t.title);
    const projId = projectFor(client.id);

    const issue = await prisma.issue.create({
      data: {
        title: t.title,
        description: t.description,
        category: t.category,
        priority: t.priority,
        status: t.status,
        clientId: client.id,
        projectId: projId,
        raisedById: raisedBy(client.id),
        assignedToId: t.assignedToId,
        escalated: false,
        slaBreached: t.slaBreached,
        slaBreachRisk: t.slaBreachRisk ?? false,
        slaDueAt: t.slaDueAt,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      },
    });

    console.log(`  [B${i + 1}] Created: ${issue.id.slice(0, 8)}… — ${t.title.substring(0, 55)}...`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GROUP C — Normal active tickets (SLA risk indicators, various states)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nGROUP C: Normal active tickets...');

  const groupC = [
    {
      title: 'Colgate: Request to add dealer performance scorecard to CRM dashboard',
      description:
        'Regional sales managers need a dealer performance scorecard view within the CRM showing monthly offtake, payment days outstanding, and return rate. Currently this data exists in separate reports and is not integrated.',
      category: 'FEATURE_REQUEST' as IssueCategory,
      priority: 'MEDIUM' as IssuePriority,
      status: 'OPEN' as IssueStatus,
      assignedToId: agent.id,
      slaBreachRisk: false,
      slaDueAt: hoursAgo(-48),
    },
    {
      title: 'BSV Bio Sciences: Regulatory dossier submission portal — PDF upload size limit',
      description:
        'The regulatory dossier submission portal rejects PDF files larger than 25MB. Clinical study reports often exceed 100MB. Teams are forced to split files manually, which breaks document integrity. Increase limit to at least 200MB.',
      category: 'FEATURE_REQUEST' as IssueCategory,
      priority: 'MEDIUM' as IssuePriority,
      status: 'ACKNOWLEDGED' as IssueStatus,
      assignedToId: agent.id,
      slaBreachRisk: false,
      slaDueAt: hoursAgo(-24),
    },
    {
      title: 'VIP Industries: Export documentation automation — Bill of Lading field mapping incorrect',
      description:
        'When generating automated Bills of Lading for export shipments, the Consignee address field is being populated with the Shipper address. This error is being caught at customs clearance and causing delays.',
      category: 'BUG' as IssueCategory,
      priority: 'HIGH' as IssuePriority,
      status: 'IN_PROGRESS' as IssueStatus,
      assignedToId: agent.id,
      slaBreachRisk: true,
      slaDueAt: hoursAgo(-4),
    },
    {
      title: 'S&P Global: ESG data feed — BRSR metrics missing for 43 Indian companies',
      description:
        'Business Responsibility and Sustainability Reporting (BRSR) metrics are missing from the ESG data feed for 43 NSE-listed companies. Clients using the India-focused ESG screening module are seeing incomplete records.',
      category: 'DATA_ACCURACY' as IssueCategory,
      priority: 'HIGH' as IssuePriority,
      status: 'ACKNOWLEDGED' as IssueStatus,
      assignedToId: null,
      slaBreachRisk: true,
      slaDueAt: hoursAgo(-2),
    },
    {
      title: 'Colgate: Mobile app — push notifications not delivered on Android 14 devices',
      description:
        'Field sales representatives using Android 14 devices are not receiving push notifications for new order alerts and visit reminders. iOS devices and older Android versions are working correctly. Approximately 340 field reps affected.',
      category: 'BUG' as IssueCategory,
      priority: 'MEDIUM' as IssuePriority,
      status: 'OPEN' as IssueStatus,
      assignedToId: null,
      slaBreachRisk: false,
      slaDueAt: hoursAgo(-72),
    },
  ];

  for (let i = 0; i < groupC.length; i++) {
    const t = groupC[i];
    const client = clientForTitle(t.title);
    const projId = projectFor(client.id);

    const issue = await prisma.issue.create({
      data: {
        title: t.title,
        description: t.description,
        category: t.category,
        priority: t.priority,
        status: t.status,
        clientId: client.id,
        projectId: projId,
        raisedById: raisedBy(client.id),
        assignedToId: t.assignedToId,
        escalated: false,
        slaBreached: false,
        slaBreachRisk: t.slaBreachRisk,
        slaDueAt: t.slaDueAt,
        createdAt: hoursAgo(24 + i * 6),
        updatedAt: hoursAgo(12 + i * 2),
      },
    });

    console.log(`  [C${i + 1}] Created: ${issue.id.slice(0, 8)}… — ${t.title.substring(0, 55)}...`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GROUP D — Recent activity (populates admin live activity feed)
  // Creates IssueHistory entries for: assigned, status_changed, resolved, priority_changed
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nGROUP D: Recent activity tickets for admin live feed...');

  const groupD = [
    {
      title: 'BSV Bio Sciences: Pharmacovigilance system — adverse event report submission timeout',
      description:
        'Adverse event reports submitted through the pharmacovigilance module are timing out after 30 seconds without saving. Regulatory compliance requires reports to be filed within 15 days of event occurrence. 8 reports are currently pending submission.',
      category: 'BUG' as IssueCategory,
      priority: 'CRITICAL' as IssuePriority,
      status: 'IN_PROGRESS' as IssueStatus,
      assignedToId: agent.id,
      historyAction: 'priority_changed',
      createdAt: minsAgo(90),
    },
    {
      title: 'S&P Global: Benchmark index rebalancing — wrong constituent weights applied',
      description:
        'The quarterly rebalancing of the S&P BSE 500 constituent weights was applied with incorrect free-float factors. Portfolios benchmarked against this index are showing tracking errors of up to 3.2%. Correction required before market open tomorrow.',
      category: 'DATA_ACCURACY' as IssueCategory,
      priority: 'HIGH' as IssuePriority,
      status: 'RESOLVED' as IssueStatus,
      assignedToId: agent.id,
      historyAction: 'resolved',
      resolvedAt: minsAgo(30),
      createdAt: hoursAgo(4),
    },
    {
      title: 'Colgate: Trade promotion management — promotional deduction calculations off by 2%',
      description:
        'Trade promotion deductions calculated by the TPM module are consistently 2% lower than what distributors are claiming. This is causing reconciliation disputes and delaying monthly settlements worth ₹8 crore.',
      category: 'DATA_ACCURACY' as IssueCategory,
      priority: 'HIGH' as IssuePriority,
      status: 'ACKNOWLEDGED' as IssueStatus,
      assignedToId: agent.id,
      historyAction: 'assigned',
      createdAt: minsAgo(45),
    },
    {
      title: 'VIP Industries: Warranty claim portal — duplicate claims being processed',
      description:
        'The warranty claims system is allowing the same serial number to be submitted multiple times, resulting in duplicate payouts. Identified 127 duplicate claims in the last 30 days totalling ₹3.8 lakhs.',
      category: 'BUG' as IssueCategory,
      priority: 'HIGH' as IssuePriority,
      status: 'IN_PROGRESS' as IssueStatus,
      assignedToId: agent.id,
      historyAction: 'assigned',
      createdAt: minsAgo(110),
    },
    {
      title: 'BSV Bio Sciences: Stability study dashboard — out-of-trend alerts not sending email',
      description:
        'Out-of-trend (OOT) alerts generated by the stability study management system are not triggering email notifications to the QC team. The alerts appear in the dashboard but the email delivery pipeline is broken since the last deployment.',
      category: 'BUG' as IssueCategory,
      priority: 'MEDIUM' as IssuePriority,
      status: 'OPEN' as IssueStatus,
      assignedToId: null,
      historyAction: 'status_changed',
      createdAt: minsAgo(60),
    },
  ];

  for (let i = 0; i < groupD.length; i++) {
    const t = groupD[i];
    const client = clientForTitle(t.title);
    const projId = projectFor(client.id);

    const issue = await prisma.issue.create({
      data: {
        title: t.title,
        description: t.description,
        category: t.category,
        priority: t.priority,
        status: t.status,
        clientId: client.id,
        projectId: projId,
        raisedById: raisedBy(client.id),
        assignedToId: t.assignedToId,
        escalated: false,
        slaBreached: false,
        resolvedAt: t.historyAction === 'resolved' ? minsAgo(30) : null,
        slaDueAt: hoursAgo(-8),
        createdAt: t.createdAt,
        updatedAt: minsAgo(10 + i * 5),
      },
    });

    // Create history entries that drive the admin live feed
    if (t.historyAction === 'assigned' && t.assignedToId) {
      await prisma.issueHistory.create({
        data: {
          issueId: issue.id,
          changedById: lead.id,
          fieldChanged: 'assignedToId',
          oldValue: null,
          newValue: t.assignedToId,
          createdAt: minsAgo(5 + i),
        },
      });
    } else if (t.historyAction === 'resolved') {
      await prisma.issueHistory.create({
        data: {
          issueId: issue.id,
          changedById: agent.id,
          fieldChanged: 'status',
          oldValue: 'IN_PROGRESS',
          newValue: 'RESOLVED',
          createdAt: minsAgo(30),
        },
      });
    } else if (t.historyAction === 'priority_changed') {
      await prisma.issueHistory.create({
        data: {
          issueId: issue.id,
          changedById: lead.id,
          fieldChanged: 'priority',
          oldValue: 'HIGH',
          newValue: 'CRITICAL',
          createdAt: minsAgo(20 + i),
        },
      });
    } else if (t.historyAction === 'status_changed') {
      await prisma.issueHistory.create({
        data: {
          issueId: issue.id,
          changedById: agent.id,
          fieldChanged: 'status',
          oldValue: 'OPEN',
          newValue: 'IN_PROGRESS',
          createdAt: minsAgo(15 + i),
        },
      });
    }

    // Also create a assignment history for the admin feed (assignedToId)
    if (t.assignedToId && t.historyAction !== 'assigned') {
      await prisma.issueHistory.create({
        data: {
          issueId: issue.id,
          changedById: admin.id,
          fieldChanged: 'assignedToId',
          oldValue: null,
          newValue: t.assignedToId,
          createdAt: minsAgo(40 + i * 3),
        },
      });
    }

    console.log(`  [D${i + 1}] Created: ${issue.id.slice(0, 8)}… — ${t.title.substring(0, 55)}...`);
  }

  console.log('\n✅ Done! Created 20 test tickets:');
  console.log('   Group A (5): Already escalated — visible on 3SC Lead escalations page immediately');
  console.log('   Group B (5): Need escalation — will be picked up by /api/cron/escalate');
  console.log('   Group C (5): Normal active tickets with SLA risk indicators');
  console.log('   Group D (5): Recent activity for admin live feed\n');
  console.log('To trigger escalation engine:');
  console.log('  curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/escalate\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

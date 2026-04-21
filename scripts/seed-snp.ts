/**
 * Seed script: Supply Network Planning (SNP) demo data
 * Clients: Colgate, VIP, BSV, Modenik
 * Projects: Replenishment Planning, Production Planning, Raw Material Planning
 * Issues: SaaS product bugs, feature requests, technical/production issues
 *
 * Run: npx tsx scripts/seed-snp.ts
 */

import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 3_600_000);
}
function daysAgo(d: number): Date {
  return hoursAgo(d * 24);
}
function daysFromNow(d: number): Date {
  return new Date(Date.now() + d * 24 * 3_600_000);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱  Seeding Supply Network Planning data…\n");

  const hash = (pw: string) => bcrypt.hash(pw, 10);

  // ── 3SC Internal team ──────────────────────────────────────────────────────
  const [admin, lead, agent1, agent2] = await Promise.all([
    prisma.user.upsert({
      where: { email: "admin@3sc.com" },
      update: {},
      create: { name: "Arjun Mehta", email: "admin@3sc.com", password: await hash("Admin@123"), role: "THREESC_ADMIN" },
    }),
    prisma.user.upsert({
      where: { email: "lead@3sc.com" },
      update: {},
      create: { name: "Priya Nair", email: "lead@3sc.com", password: await hash("Lead@123"), role: "THREESC_LEAD" },
    }),
    prisma.user.upsert({
      where: { email: "ravi@3sc.com" },
      update: {},
      create: { name: "Ravi Kumar", email: "ravi@3sc.com", password: await hash("Agent@123"), role: "THREESC_AGENT" },
    }),
    prisma.user.upsert({
      where: { email: "sneha@3sc.com" },
      update: {},
      create: { name: "Sneha Patel", email: "sneha@3sc.com", password: await hash("Agent@123"), role: "THREESC_AGENT" },
    }),
  ]);
  console.log("✅  3SC team: admin, lead, 2 agents");

  // ── Clients ────────────────────────────────────────────────────────────────
  const clientDefs = [
    { name: "Colgate-Palmolive", industry: "FMCG / Consumer Goods", adminEmail: "admin@colgate.com", adminName: "Rahul Verma", userEmail: "planner@colgate.com", userName: "Deepa Singh" },
    { name: "VIP Industries", industry: "Luggage & Travel Goods", adminEmail: "admin@vip.com", adminName: "Nikhil Shah", userEmail: "planner@vip.com", userName: "Anjali Rao" },
    { name: "BSV Pharma", industry: "Pharmaceuticals", adminEmail: "admin@bsv.com", adminName: "Dr. Kiran Reddy", userEmail: "planner@bsv.com", userName: "Suresh Iyer" },
    { name: "Modenik Lifestyle", industry: "Apparel & Fashion", adminEmail: "admin@modenik.com", adminName: "Pooja Kapoor", userEmail: "planner@modenik.com", userName: "Amit Joshi" },
  ];

  const clients: Record<string, string> = {}; // name → id
  const clientUsers: Record<string, { adminId: string; userId: string }> = {};

  for (const cd of clientDefs) {
    const client = await prisma.client.upsert({
      where: { name: cd.name } as any,
      update: {},
      create: {
        name: cd.name,
        industry: cd.industry,
        contractStart: daysAgo(180),
        contractEnd: daysFromNow(185),
        isActive: true,
      },
    });
    clients[cd.name] = client.id;

    const [cAdmin, cUser] = await Promise.all([
      prisma.user.upsert({
        where: { email: cd.adminEmail },
        update: {},
        create: { name: cd.adminName, email: cd.adminEmail, password: await hash("Client@123"), role: "CLIENT_ADMIN" },
      }),
      prisma.user.upsert({
        where: { email: cd.userEmail },
        update: {},
        create: { name: cd.userName, email: cd.userEmail, password: await hash("Client@123"), role: "CLIENT_USER" },
      }),
    ]);
    clientUsers[cd.name] = { adminId: cAdmin.id, userId: cUser.id };

    // Link users to client
    await Promise.all([
      prisma.clientMember.upsert({
        where: { id: `${client.id}-${cAdmin.id}` } as any,
        update: {},
        create: { clientId: client.id, userId: cAdmin.id },
      }).catch(() =>
        prisma.clientMember.findFirst({ where: { clientId: client.id, userId: cAdmin.id } })
          .then((m) => m ?? prisma.clientMember.create({ data: { clientId: client.id, userId: cAdmin.id } }))
      ),
      prisma.clientMember.upsert({
        where: { id: `${client.id}-${cUser.id}` } as any,
        update: {},
        create: { clientId: client.id, userId: cUser.id },
      }).catch(() =>
        prisma.clientMember.findFirst({ where: { clientId: client.id, userId: cUser.id } })
          .then((m) => m ?? prisma.clientMember.create({ data: { clientId: client.id, userId: cUser.id } }))
      ),
    ]);

    console.log(`✅  Client: ${cd.name}`);
  }

  // ── SLA policies ───────────────────────────────────────────────────────────
  await Promise.all([
    prisma.slaPolicy.upsert({ where: { priority: "CRITICAL" }, update: {}, create: { priority: "CRITICAL", responseTime: 1, resolutionTime: 4 } }),
    prisma.slaPolicy.upsert({ where: { priority: "HIGH" }, update: {}, create: { priority: "HIGH", responseTime: 4, resolutionTime: 24 } }),
    prisma.slaPolicy.upsert({ where: { priority: "MEDIUM" }, update: {}, create: { priority: "MEDIUM", responseTime: 8, resolutionTime: 72 } }),
    prisma.slaPolicy.upsert({ where: { priority: "LOW" }, update: {}, create: { priority: "LOW", responseTime: 24, resolutionTime: 120 } }),
  ]);
  console.log("✅  SLA policies");

  // ── Projects ───────────────────────────────────────────────────────────────
  const projectDefs = [
    { name: "Replenishment Planning", description: "Automated replenishment recommendations, safety stock optimisation, and demand-driven inventory management for the SNP platform." },
    { name: "Production Planning", description: "Capacity-constrained production scheduling, work-order sequencing, and finite/infinite capacity planning modules." },
    { name: "Raw Material Planning", description: "Vendor lead-time management, BOM explosion, multi-tier raw material visibility, and procurement plan generation." },
  ];

  const projectIds: Record<string, Record<string, string>> = {}; // clientName → projectName → id

  for (const [clientName, clientId] of Object.entries(clients)) {
    projectIds[clientName] = {};
    for (const pd of projectDefs) {
      const existing = await prisma.project.findFirst({
        where: { clientId, name: pd.name },
        select: { id: true },
      });
      const proj = existing ?? await prisma.project.create({
        data: {
          clientId,
          name: pd.name,
          description: pd.description,
          status: "ACTIVE",
          startDate: daysAgo(90),
          endDate: daysFromNow(275),
          assignedLead: lead.id,
          createdBy: admin.id,
        },
      });
      projectIds[clientName][pd.name] = proj.id;
    }
    console.log(`✅  Projects for ${clientName}`);
  }

  // ── Issues ─────────────────────────────────────────────────────────────────

  type IssueInput = {
    clientName: string;
    project: string;
    title: string;
    description: string;
    category: "BUG" | "FEATURE_REQUEST" | "TECHNICAL" | "GENERAL";
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    status: "OPEN" | "ACKNOWLEDGED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
    assignedTo?: "agent1" | "agent2";
    escalated?: boolean;
    slaBreached?: boolean;
    resolvedAt?: Date;
  };

  const issueDefs: IssueInput[] = [
    // ── COLGATE ── Replenishment Planning ──────────────────────────────────
    {
      clientName: "Colgate-Palmolive", project: "Replenishment Planning",
      title: "Replenishment recommendations not recalculating after demand signal update",
      description: "After a demand signal import from Salesforce, the system does not regenerate replenishment recommendations unless a manual 'Run Planning' is triggered. Expected behaviour: automatic re-run within 15 minutes of signal ingestion.\n\nSteps to reproduce:\n1. Upload a new demand forecast file via the Demand Signals module\n2. Wait 20 minutes\n3. Open Replenishment Recommendations — values still reflect old forecast\n\nError log: No errors shown in UI; backend job queue appears stuck.",
      category: "BUG", priority: "HIGH", status: "IN_PROGRESS", assignedTo: "agent1",
    },
    {
      clientName: "Colgate-Palmolive", project: "Replenishment Planning",
      title: "Safety stock values displaying negative for high-velocity SKUs",
      description: "Safety stock calculation for SKUs with a coefficient of variation > 0.8 returns a negative quantity in the planning UI. This causes the system to suggest zero replenishment orders, leading to out-of-stock risk.\n\nAffected SKUs: Colgate Strong Teeth 200g, Palmolive Body Wash 500ml (SKU IDs available on request).\n\nExpected: Safety stock must never be negative — floor at 0.",
      category: "BUG", priority: "CRITICAL", status: "OPEN", slaBreached: true,
    },
    {
      clientName: "Colgate-Palmolive", project: "Replenishment Planning",
      title: "Add seasonal override capability to replenishment parameters",
      description: "We need the ability to apply seasonal multipliers to reorder points and safety stock targets without modifying the base planning parameters. During festive seasons (Diwali, Christmas), our demand patterns change significantly and the static model under-stocks key SKUs.\n\nRequested feature:\n- Seasonal profile configuration (date range + multiplier per SKU/category)\n- Automatic rollback to base parameters after season end\n- Audit trail for overrides",
      category: "FEATURE_REQUEST", priority: "MEDIUM", status: "ACKNOWLEDGED", assignedTo: "agent2",
    },
    {
      clientName: "Colgate-Palmolive", project: "Replenishment Planning",
      title: "Batch replenishment export to SAP S/4HANA timing out for >5000 SKUs",
      description: "The scheduled nightly export of replenishment orders to SAP S/4HANA is timing out when the SKU count exceeds 5,000 lines. The job runs for ~45 minutes and then aborts with a 504 gateway timeout, leaving SAP without updated replenishment data.\n\nImpact: Production lines in Baddi plant received incorrect material release quantities on 18 Apr 2026.",
      category: "TECHNICAL", priority: "CRITICAL", status: "IN_PROGRESS", assignedTo: "agent1", escalated: true,
    },

    // ── COLGATE ── Production Planning ────────────────────────────────────
    {
      clientName: "Colgate-Palmolive", project: "Production Planning",
      title: "Finite capacity planning ignoring shared resource constraints across lines",
      description: "When two production lines share a common cleaning/changeover crew, the finite capacity planner schedules both simultaneously during the same crew shift window. This results in infeasible production plans that planners must manually correct.\n\nReproducible on: Baddi Plant, Lines 3 and 5 (shared cleaning crew ID: CLN-02).",
      category: "BUG", priority: "HIGH", status: "IN_PROGRESS", assignedTo: "agent2",
    },
    {
      clientName: "Colgate-Palmolive", project: "Production Planning",
      title: "Enable what-if scenario comparison view for capacity plans",
      description: "We want to model 2–3 capacity scenarios side-by-side before committing to a production plan. Currently only one scenario can be active at a time and there is no comparison dashboard.\n\nDesired features:\n- Create named scenarios (e.g. 'Base Plan', 'Surge Plan', 'Lean Plan')\n- Side-by-side KPI comparison (utilisation %, OTD, overtime cost)\n- Promote a scenario to live plan with one click",
      category: "FEATURE_REQUEST", priority: "MEDIUM", status: "OPEN", assignedTo: "agent1",
    },
    {
      clientName: "Colgate-Palmolive", project: "Production Planning",
      title: "Work order sequencing module crashing on startup for Silvassa plant",
      description: "After the 14 Apr 2026 platform update (v3.12.1), the Work Order Sequencing module fails to load for any plant configured as multi-shift with overlapping windows. Error in console: `Cannot read properties of undefined (reading 'shiftBoundaries')`.\n\nSilvassa plant is completely unable to generate sequenced production schedules.",
      category: "BUG", priority: "CRITICAL", status: "RESOLVED", assignedTo: "agent1",
      resolvedAt: hoursAgo(36),
    },

    // ── VIP ── Replenishment Planning ─────────────────────────────────────
    {
      clientName: "VIP Industries", project: "Replenishment Planning",
      title: "Min-max replenishment parameters not saving correctly for accessories category",
      description: "When setting min-max parameters for the Accessories category (locks, travel pillows, pouches), the values save successfully but revert to the previous values on the next page refresh. Investigated — the PUT request returns 200 but database row is not updated.\n\nCategory tree ID: CAT-ACC-04.",
      category: "BUG", priority: "HIGH", status: "OPEN", assignedTo: "agent2",
    },
    {
      clientName: "VIP Industries", project: "Replenishment Planning",
      title: "Integrate replenishment module with Flipkart and Amazon seller APIs",
      description: "VIP sells on Flipkart and Amazon. We need the replenishment planning module to pull channel inventory and pending orders from both marketplace APIs and factor this into replenishment quantities.\n\nThis would prevent over-replenishment to warehouses when marketplace inventory is high.",
      category: "FEATURE_REQUEST", priority: "MEDIUM", status: "ACKNOWLEDGED", assignedTo: "agent1",
    },
    {
      clientName: "VIP Industries", project: "Replenishment Planning",
      title: "Planning engine performance degradation — 4x slower after March data migration",
      description: "Following the historical data migration in March 2026 (36 months of transaction history), the planning engine run time has increased from an average of 8 minutes to 34 minutes. No configuration changes were made.\n\nSuspect: missing index on the sku_transaction_history table post-migration. Please review and optimise query execution plan.",
      category: "TECHNICAL", priority: "HIGH", status: "IN_PROGRESS", assignedTo: "agent2",
    },

    // ── VIP ── Production Planning ────────────────────────────────────────
    {
      clientName: "VIP Industries", project: "Production Planning",
      title: "Changeover time matrix not applied correctly for shell moulding operations",
      description: "The changeover time matrix (configured in Admin → Plant Settings → Changeover) is not being applied when scheduling shell moulding operations. All changeovers are using a flat 30-minute value instead of the colour-to-colour matrix which has values ranging from 15–120 minutes.\n\nThis causes significant schedule infeasibility downstream.",
      category: "BUG", priority: "HIGH", status: "IN_PROGRESS", assignedTo: "agent1",
    },
    {
      clientName: "VIP Industries", project: "Production Planning",
      title: "Production plan PDF export missing BOM exploded quantities",
      description: "When exporting the production plan to PDF, the BOM-exploded raw material quantities are missing from the report. Only the finished goods line is printed. This makes the report unusable for shop floor handover.\n\nThe Excel export works correctly — only the PDF has this issue.",
      category: "BUG", priority: "MEDIUM", status: "OPEN",
    },
    {
      clientName: "VIP Industries", project: "Production Planning",
      title: "Add mobile-friendly view for shop floor production status",
      description: "Our shop floor supervisors use mobile devices to check production status. The current portal is not responsive on screens below 768px and key data (work order status, quantities, machine assignments) is unusable.\n\nRequest: A lightweight, mobile-optimised view (PWA or responsive page) for shop floor status monitoring.",
      category: "FEATURE_REQUEST", priority: "LOW", status: "OPEN",
    },

    // ── VIP ── Raw Material Planning ──────────────────────────────────────
    {
      clientName: "VIP Industries", project: "Raw Material Planning",
      title: "BOM explosion failing for multi-level assemblies beyond 3 levels",
      description: "The Raw Material Planning module only explodes BOMs up to 3 levels deep. VIP's premium hardcase range has a 5-level BOM (finished good → sub-assembly → component → sub-component → raw material). Level 4 and 5 materials are not appearing in procurement plans.\n\nThis results in unplanned material shortages.",
      category: "BUG", priority: "HIGH", status: "ACKNOWLEDGED", assignedTo: "agent2",
    },

    // ── BSV ── Production Planning ────────────────────────────────────────
    {
      clientName: "BSV Pharma", project: "Production Planning",
      title: "GMP batch scheduling constraints not enforced — quarantine period ignored",
      description: "The production planner is scheduling downstream packaging operations before the mandatory GMP quarantine period (72 hours post-fill) has elapsed. This is a critical compliance violation.\n\nAffected products: BSV Heparin Injection 5000IU, BSV Enoxaparin 40mg.\n\nThis must be treated as a P0 issue — regulatory audit is scheduled for 28 April 2026.",
      category: "BUG", priority: "CRITICAL", status: "IN_PROGRESS", assignedTo: "agent1", escalated: true,
    },
    {
      clientName: "BSV Pharma", project: "Production Planning",
      title: "Production plan fails to account for equipment validation windows (IQ/OQ/PQ)",
      description: "When equipment undergoes IQ/OQ/PQ validation post-maintenance, those windows are not being blocked in the production schedule. Orders are being assigned to equipment during its validation blackout period.\n\nRequest: Block equipment calendar during validation windows entered in the Equipment Master.",
      category: "BUG", priority: "HIGH", status: "OPEN", assignedTo: "agent2",
    },
    {
      clientName: "BSV Pharma", project: "Production Planning",
      title: "Regulatory reporting module — automated batch release dossier generation",
      description: "BSV requires an automated dossier (PDF) summarising batch production data for regulatory submission. Currently this data is manually compiled from multiple system screens.\n\nRequired fields: batch number, product code, manufacturing date, expiry date, yield %, deviations logged, QA sign-off.\n\nThis would save ~3 hours per batch release.",
      category: "FEATURE_REQUEST", priority: "MEDIUM", status: "ACKNOWLEDGED", assignedTo: "agent2",
    },
    {
      clientName: "BSV Pharma", project: "Production Planning",
      title: "API sync between SNP and PAS-X MES failing intermittently",
      description: "The real-time sync between the SNP Production Planning module and our PAS-X Manufacturing Execution System is failing with a 503 error approximately 3–4 times per day. Each failure creates a 15–45 minute gap in production execution data.\n\nError: `Connection pool exhausted — max 20 connections reached`.\n\nLast occurrence: 20 Apr 2026 14:32 IST.",
      category: "TECHNICAL", priority: "HIGH", status: "IN_PROGRESS", assignedTo: "agent1",
    },

    // ── BSV ── Raw Material Planning ──────────────────────────────────────
    {
      clientName: "BSV Pharma", project: "Raw Material Planning",
      title: "Vendor lead time updates not propagating to procurement plan",
      description: "When a vendor's lead time is updated in the Vendor Master (e.g., API supplier extended from 21 to 35 days), the procurement plan does not recalculate. Existing purchase order suggestions retain the old lead time.\n\nA manual 'Regenerate Plan' is required each time — this defeats the purpose of automated planning.",
      category: "BUG", priority: "HIGH", status: "OPEN", assignedTo: "agent2",
    },
    {
      clientName: "BSV Pharma", project: "Raw Material Planning",
      title: "Enable dual-sourcing split configuration in raw material planning",
      description: "For critical APIs (Active Pharmaceutical Ingredients), BSV maintains two approved vendors. We need the ability to configure a sourcing split (e.g., 60/40) so the planning engine generates purchase orders to both vendors proportionally.\n\nCurrently only a single preferred vendor is supported per material.",
      category: "FEATURE_REQUEST", priority: "HIGH", status: "ACKNOWLEDGED", assignedTo: "agent1",
    },

    // ── BSV ── Replenishment Planning ─────────────────────────────────────
    {
      clientName: "BSV Pharma", project: "Replenishment Planning",
      title: "Cold chain SKU replenishment ignoring temperature-controlled storage capacity",
      description: "Replenishment recommendations for cold chain products (2–8°C storage) do not factor in the available cold storage capacity at depot locations. The system is recommending quantities that exceed physical cold room capacity.\n\nDepot: Badlapur CDC — Cold room capacity: 500 pallet positions. System recommending 820 pallets.",
      category: "BUG", priority: "CRITICAL", status: "IN_PROGRESS", assignedTo: "agent1", escalated: true,
    },

    // ── MODENIK ── Replenishment Planning ────────────────────────────────
    {
      clientName: "Modenik Lifestyle", project: "Replenishment Planning",
      title: "Size-curve replenishment not available for apparel SKUs",
      description: "Apparel replenishment requires distribution by size curve (e.g., XS:5%, S:20%, M:35%, L:25%, XL:15%). The current replenishment module treats all variants (sizes) as independent SKUs without size-curve logic, resulting in size imbalances at store level.\n\nThis is a critical gap for our fashion retail business.",
      category: "FEATURE_REQUEST", priority: "HIGH", status: "OPEN", assignedTo: "agent2",
    },
    {
      clientName: "Modenik Lifestyle", project: "Replenishment Planning",
      title: "Markdown/end-of-season flag not reducing replenishment targets",
      description: "When a product is flagged for markdown or end-of-season clearance, the replenishment module continues to generate full replenishment orders. The markdown flag in the Product Master has no impact on replenishment recommendations.\n\nThis is causing over-stock of end-of-season styles that will eventually be marked down at a loss.",
      category: "BUG", priority: "HIGH", status: "OPEN", assignedTo: "agent1",
    },

    // ── MODENIK ── Production Planning ────────────────────────────────────
    {
      clientName: "Modenik Lifestyle", project: "Production Planning",
      title: "Fabric cutting plan not integrating with vendor capacity booking",
      description: "The production plan generated by the system does not push capacity booking requests to our fabric processing vendors. Planners must manually call vendors to book cutting and stitching capacity, introducing delays and errors.\n\nRequest: Automated vendor capacity booking via email/API integration with fabric processor's booking portal.",
      category: "FEATURE_REQUEST", priority: "MEDIUM", status: "ACKNOWLEDGED", assignedTo: "agent2",
    },
    {
      clientName: "Modenik Lifestyle", project: "Production Planning",
      title: "Style-level capacity plan report showing 0% utilisation for all records",
      description: "The Style Capacity Plan report (Reports → Production → Style Capacity) is showing 0% utilisation across all records despite active production orders in the system. The underlying data exists but appears to not be joining correctly to the report query.\n\nReport affected: v2.3 of the Style Capacity Report introduced in the Mar 2026 update.",
      category: "BUG", priority: "HIGH", status: "IN_PROGRESS", assignedTo: "agent1",
    },

    // ── MODENIK ── Raw Material Planning ─────────────────────────────────
    {
      clientName: "Modenik Lifestyle", project: "Raw Material Planning",
      title: "Fabric consumption norms (FCN) not pulling from latest approved tech pack",
      description: "The Raw Material Planning module uses fabric consumption norms from the initial tech pack version. When the design team approves a revised tech pack with updated FCN, the planning system does not auto-update. This results in procurement of incorrect fabric quantities.\n\nExpected: Latest approved tech pack version should be used automatically.",
      category: "BUG", priority: "HIGH", status: "OPEN", assignedTo: "agent2",
    },
    {
      clientName: "Modenik Lifestyle", project: "Raw Material Planning",
      title: "Enable substitute material mapping for discontinued fabric suppliers",
      description: "When a fabric supplier discontinues a material, planners need to quickly map substitute materials and regenerate procurement plans. Currently substitutes must be manually configured for each BOM, which takes 2–3 days.\n\nRequested: A bulk substitute mapping tool with auto-propagation to open procurement plans.",
      category: "FEATURE_REQUEST", priority: "MEDIUM", status: "OPEN",
    },
    {
      clientName: "Modenik Lifestyle", project: "Raw Material Planning",
      title: "Nightly material requirements planning (MRP) job failed — Jan–Mar 2026 data missing",
      description: "The nightly MRP batch job has been silently failing for the past 3 nights (18–20 Apr 2026). The job shows 'Completed' in the job scheduler but the material requirements output table has not been updated. Jan–Mar 2026 historical actuals are missing from MRP inputs.\n\nCritical — procurement team unable to generate POs for next month.",
      category: "TECHNICAL", priority: "CRITICAL", status: "IN_PROGRESS", assignedTo: "agent1", escalated: true,
    },
  ];

  let issueCounter = 1000;
  for (const def of issueDefs) {
    const clientId = clients[def.clientName];
    const projectId = projectIds[def.clientName][def.project];
    const raisedById = clientUsers[def.clientName].adminId;
    const assignedToId =
      def.assignedTo === "agent1" ? agent1.id :
      def.assignedTo === "agent2" ? agent2.id :
      undefined;

    const slaDueAt =
      def.priority === "CRITICAL" ? hoursAgo(def.slaBreached ? 2 : -2) :
      def.priority === "HIGH"     ? daysFromNow(def.slaBreached ? -1 : 1) :
      def.priority === "MEDIUM"   ? daysFromNow(3) :
      daysFromNow(5);

    const ticketKey = `SNP-${issueCounter++}`;

    await prisma.issue.create({
      data: {
        ticketKey,
        title: def.title,
        description: def.description,
        category: def.category,
        priority: def.priority,
        status: def.status,
        clientId,
        projectId,
        raisedById,
        assignedToId,
        escalated: def.escalated ?? false,
        escalatedAt: def.escalated ? hoursAgo(4) : null,
        escalatedToId: def.escalated ? lead.id : null,
        slaBreached: def.slaBreached ?? false,
        slaDueAt,
        resolvedAt: def.resolvedAt ?? null,
        createdAt: daysAgo(Math.floor(Math.random() * 14) + 1),
      },
    });
  }
  console.log(`✅  Created ${issueDefs.length} issues`);

  // ── Milestones ─────────────────────────────────────────────────────────────
  const milestoneTemplates = [
    { title: "Requirements Finalisation", status: "COMPLETED" as const, offsetDays: -70 },
    { title: "Phase 1 Configuration & Setup", status: "COMPLETED" as const, offsetDays: -45 },
    { title: "User Acceptance Testing (UAT)", status: "IN_PROGRESS" as const, offsetDays: 15 },
    { title: "Go-Live & Hypercare", status: "PENDING" as const, offsetDays: 60 },
    { title: "Steady-State Handover", status: "PENDING" as const, offsetDays: 120 },
  ];

  for (const [clientName] of Object.entries(clients)) {
    for (const [projectName, projectId] of Object.entries(projectIds[clientName])) {
      for (const ms of milestoneTemplates) {
        const existingMs = await prisma.milestone.findFirst({ where: { projectId, title: ms.title } });
        if (!existingMs) {
          await prisma.milestone.create({
            data: {
              projectId,
              title: ms.title,
              description: `${ms.title} for ${projectName} — ${clientName}`,
              dueDate: ms.offsetDays > 0 ? daysFromNow(ms.offsetDays) : daysAgo(-ms.offsetDays),
              status: ms.status,
            },
          });
        }
      }
    }
  }
  console.log("✅  Milestones created");

  console.log("\n🎉  Seed complete!\n");
  console.log("Login credentials:");
  console.log("  Admin:        admin@3sc.com       / Admin@123");
  console.log("  Lead:         lead@3sc.com        / Lead@123");
  console.log("  Agent 1:      ravi@3sc.com        / Agent@123");
  console.log("  Agent 2:      sneha@3sc.com       / Agent@123");
  console.log("  Colgate Admin: admin@colgate.com  / Client@123");
  console.log("  VIP Admin:     admin@vip.com      / Client@123");
  console.log("  BSV Admin:     admin@bsv.com      / Client@123");
  console.log("  Modenik Admin: admin@modenik.com  / Client@123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

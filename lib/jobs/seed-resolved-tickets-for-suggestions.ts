import { prisma } from "@/lib/prisma";
import { generateTicketKey } from "@/lib/ticket-key";

/**
 * Creates realistic resolved tickets for the suggestions feature
 * These tickets should be matched by the semantic search when users create new tickets
 */
async function seedResolvedTicketsForSuggestions() {
  try {
    console.log("🎯 Creating resolved tickets for suggestions...");

    // Get Colgate project
    const colgatePlan = await prisma.project.findFirst({
      where: { name: { contains: "Replenishment" } },
    });

    const colgateProduction = await prisma.project.findFirst({
      where: { name: { contains: "Production" } },
    });

    const colgateRawMat = await prisma.project.findFirst({
      where: { name: { contains: "Raw Material" } },
    });

    // Get Modenik project
    const modenik = await prisma.project.findFirst({
      where: { clientId: { not: colgatePlan?.clientId } },
    });

    if (!colgatePlan || !colgateProduction || !colgateRawMat || !modenik) {
      console.error("❌ Projects not found. Run seed-base-data first.");
      return;
    }

    // Get a client user and internal users
    const clientUser = await prisma.user.findFirst({
      where: { role: "CLIENT_USER" },
    });

    const internalUser = await prisma.user.findFirst({
      where: { role: "THREESC_AGENT" },
    });

    if (!clientUser || !internalUser) {
      console.error("❌ Users not found. Run seed-base-data first.");
      return;
    }

    const resolvedTickets = [
      // Replenishment Planning issues
      {
        title: "Dashboard not displaying inventory levels",
        description:
          "Users reported that the inventory dashboard is not showing current stock levels. The data appears to be 2 days old.",
        projectId: colgatePlan.id,
        category: "BUG" as const,
        priority: "HIGH",
        resolution:
          "Fixed cache invalidation logic that was preventing real-time updates. Updated Redis TTL from 24h to 1h.",
      },
      {
        title: "Cannot update replenishment schedule",
        description:
          "When trying to modify the replenishment schedule for SKU ABC123, the system returns a validation error even though all fields are correct.",
        projectId: colgatePlan.id,
        category: "BUG" as const,
        priority: "CRITICAL",
        resolution:
          "Issue was in the date validation logic. The end date was being validated against created date instead of start date. Fixed in v2.1.3.",
      },
      {
        title: "Forecast accuracy report missing data",
        description:
          "The forecast accuracy report for April shows no data even though historical forecasts exist. Export to CSV also fails.",
        projectId: colgatePlan.id,
        category: "DATA_ACCURACY" as const,
        priority: "MEDIUM",
        resolution:
          "Database query was filtering out records with NULL confidence values. Updated query to include NULL values with default confidence of 0.75.",
      },
      {
        title: "API timeout when fetching large datasets",
        description:
          "When generating reports for >50 SKUs, the API call times out after 30 seconds. Works fine for smaller datasets.",
        projectId: colgatePlan.id,
        category: "PERFORMANCE" as const,
        priority: "HIGH",
        resolution:
          "Implemented pagination and async processing. Large reports now use job queue and are emailed when ready.",
      },

      // Production Planning issues
      {
        title: "Production schedule not syncing with ERP",
        description:
          "Changes made in the ERP system are not reflecting in our production planning module. Sync status shows success but data is stale.",
        projectId: colgateProduction.id,
        category: "BUG" as const,
        priority: "CRITICAL",
        resolution:
          "API integration was caching responses for 6 hours. Reduced cache TTL to 5 minutes and added manual sync button.",
      },
      {
        title: "Cannot assign resources to production line",
        description:
          "Getting error 'Invalid resource ID' when trying to assign workers to Line A-5. Same workers can be assigned to other lines.",
        projectId: colgateProduction.id,
        category: "BUG" as const,
        priority: "HIGH",
        resolution:
          "Line A-5 had an incorrect facility code in the database. Updated facility mapping and re-synced resource pools.",
      },
      {
        title: "Bottleneck analysis shows incorrect data",
        description:
          "The system identifies Line B-2 as a bottleneck, but manual analysis shows it has the highest throughput. Metrics seem inverted.",
        projectId: colgateProduction.id,
        category: "DATA_ACCURACY" as const,
        priority: "MEDIUM",
        resolution:
          "Formula for calculating bottleneck was using MIN instead of MAX for throughput comparison. Fixed calculation logic.",
      },
      {
        title: "Cannot export production schedule",
        description:
          "Export button for production schedule returns a blank file. Works in staging environment but not in production.",
        projectId: colgateProduction.id,
        category: "BUG" as const,
        priority: "MEDIUM",
        resolution:
          "Production environment was missing the report template file. Deployed missing asset and cleared CDN cache.",
      },

      // Raw Material Planning issues
      {
        title: "Supplier inventory not updating",
        description:
          "Real-time inventory from suppliers is not updating. Last update was 3 days ago. Manual refresh doesn't help.",
        projectId: colgateRawMat.id,
        category: "BUG" as const,
        priority: "CRITICAL",
        resolution:
          "Webhook from supplier was failing silently due to SSL certificate mismatch. Updated certificate and verified webhook delivery.",
      },
      {
        title: "Cannot create purchase order",
        description:
          "When clicking 'Create PO' for a raw material, the form doesn't load. Console shows 'Cannot read property of undefined'.",
        projectId: colgateRawMat.id,
        category: "BUG" as const,
        priority: "HIGH",
        resolution:
          "Form initialization was failing when supplier had no prior POs. Added fallback for empty history.",
      },
      {
        title: "Material cost calculation is off",
        description:
          "Total cost for raw materials is showing 15% higher than expected. Unit prices are correct but the sum is wrong.",
        projectId: colgateRawMat.id,
        category: "DATA_ACCURACY" as const,
        priority: "HIGH",
        resolution:
          "Tax calculation was being applied twice due to duplicate middleware. Removed duplicate tax middleware from pipeline.",
      },
      {
        title: "Lead time forecast inaccurate",
        description:
          "System shows 2-week lead time for materials that typically arrive in 3-4 days. Supplier SLAs are correctly configured.",
        projectId: colgateRawMat.id,
        category: "DATA_ACCURACY" as const,
        priority: "MEDIUM",
        resolution:
          "Lead time calculation was using worst-case scenario from historical data. Implemented percentile-based calculation (85th percentile).",
      },

      // Modenik tickets
      {
        title: "User authentication failing intermittently",
        description:
          "Some users report being logged out randomly even though sessions are active. Happens especially during peak hours.",
        projectId: modenik.id,
        category: "ACCESS_SECURITY" as const,
        priority: "CRITICAL",
        resolution:
          "Session store was losing data during garbage collection. Migrated to persistent session storage with proper TTL handling.",
      },
      {
        title: "Page loading very slowly",
        description:
          "Dashboard takes 8-10 seconds to load. Network tab shows multiple queries. Same issue doesn't happen in development.",
        projectId: modenik.id,
        category: "PERFORMANCE" as const,
        priority: "HIGH",
        resolution:
          "Added database indexes on frequently queried columns. Implemented query caching. Page load reduced to 1.2 seconds.",
      },
      {
        title: "Mobile app crashes on startup",
        description:
          "iOS app version 3.2.1 crashes immediately after launch. Works fine on Android. Crash logs show null reference.",
        projectId: modenik.id,
        category: "BUG" as const,
        priority: "CRITICAL",
        resolution:
          "iOS app was missing a configuration file in the build. Rebuilt and signed with correct provisioning profile.",
      },
    ];

    // Create resolved tickets
    for (const ticketData of resolvedTickets) {
      const ticketKey = await generateTicketKey(ticketData.projectId);
      const ticket = await prisma.issue.create({
        data: {
          title: ticketData.title,
          description: ticketData.description,
          category: ticketData.category,
          priority: ticketData.priority as any,
          status: "RESOLVED",
          raisedById: clientUser.id,
          assignedToId: internalUser.id,
          projectId: ticketData.projectId,
          clientId: ticketData.projectId === modenik.id ? modenik.clientId : colgatePlan.clientId,
          ticketKey,
          resolvedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date in last 30 days
        },
      });

      // Add resolution comment
      await prisma.comment.create({
        data: {
          issueId: ticket.id,
          authorId: internalUser.id,
          content: `**Resolution:** ${ticketData.resolution}`,
        },
      });

      console.log(`✅ Created: "${ticketData.title}"`);
    }

    console.log(
      `\n✨ Successfully created ${resolvedTickets.length} resolved tickets for suggestions!`
    );
  } catch (error) {
    console.error("❌ Error seeding suggestions:", error);
    throw error;
  }
}

seedResolvedTicketsForSuggestions()
  .then(() => {
    console.log("🎉 Done!");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

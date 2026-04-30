import { prisma } from "@/lib/prisma";

async function createInternalKB() {
  try {
    // Find a 3SC agent to be the author
    const author = await prisma.user.findFirst({
      where: { role: "THREESC_AGENT" },
    });

    if (!author) {
      console.error("No 3SC agent found to create articles");
      return;
    }

    const internalArticles = [
      {
        title: "Troubleshooting: Common Production Planning Issues",
        slug: "troubleshooting-production-planning",
        category: "Troubleshooting",
        content: `# Common Production Planning Issues & Solutions

## Issue: Bottleneck Detection Not Working
When the system fails to identify production bottlenecks:
1. Check if all workstation sensors are connected and reporting data
2. Verify that the forecasting algorithm has at least 30 days of historical data
3. Re-run the bottleneck analysis from Admin Dashboard
4. If still failing, check database logs for query errors

## Issue: SLA Breaches Spike Unexpectedly
If SLA breaches increase suddenly:
1. Check if new orders have unusual volumes (above 150% of average)
2. Verify machine maintenance schedules haven't changed
3. Review if customer lead time expectations changed
4. Run capacity planning analysis to identify if adding resources is needed

## Issue: Replenishment Safety Stock Too High
If safety stock calculations seem excessive:
1. Check demand variability - high variance = higher safety stock needed
2. Verify lead time data is accurate (often under-reported)
3. Review target service level (99.2% is standard, adjust if needed)
4. Analyze 6-month rolling average instead of all historical data

## Escalation Procedure
If issues persist after these steps, escalate to the Colgate Supply Chain Manager with:
- Ticket ID
- Exact timestamps of the problem
- Screenshots of the issue
- Steps already taken to troubleshoot`,
        isInternal: true,
        isPublished: true,
      },
      {
        title: "Best Practice: Effective Client Communication During Issues",
        slug: "best-practice-client-communication",
        category: "BestPractices",
        content: `# Best Practices for Client Communication During Issues

## Pre-Issue Communication
1. **Monthly Health Checks** - Schedule brief calls with clients to review forecasting accuracy
2. **Share Dashboards** - Provide read-only access to key metrics so clients see data in real-time
3. **Set Expectations** - Clearly communicate what the system can and cannot predict

## During an Issue
1. **Acknowledge Within 30 Minutes** - Send acknowledgment even if investigation is ongoing
2. **Provide Timeline** - Tell client when to expect next update (typically within 4-8 hours)
3. **Share Context** - Explain what might be causing the issue in business terms, not technical jargon
4. **Offer Workarounds** - Provide interim solutions while fix is being developed

## Post-Resolution
1. **Detailed Explanation** - Explain what happened and why (why supply chain example: "SSL certificate mismatch prevented authentication")
2. **Impact Summary** - Quantify the impact (e.g., "This affected 3 users for 45 minutes")
3. **Prevention Steps** - Explain what we're doing to prevent recurrence
4. **Followup Call** - Schedule brief call to ensure issue is fully resolved on their end

## Template Messages
**Acknowledgment**: "We've received your report about [issue]. Our team is investigating and will update you by [time]. Your ticket ID is [COLGATE-####]."

**Progress Update**: "We've identified the issue: [brief explanation]. We're implementing a fix and expect to have it deployed by [time]."

**Resolution**: "The issue is now resolved. Here's what happened and why: [explanation]. We've taken [prevention step] to prevent this in the future."`,
        isInternal: true,
        isPublished: true,
      },
      {
        title: "Best Practice: Demand Forecasting Accuracy Targets",
        slug: "best-practice-forecasting-accuracy",
        category: "BestPractices",
        content: `# Demand Forecasting Accuracy Targets & Improvements

## Target Accuracy Levels (MAPE - Mean Absolute Percentage Error)
- **Excellent**: < 10% - Rare for supply chain forecasts
- **Good**: 10-20% - Standard target for stable demand
- **Acceptable**: 20-30% - Common for volatile products
- **Poor**: > 30% - Needs model adjustment

## How to Improve Accuracy
1. **Include Promotional Plans** - Customer should share planned promotions 60+ days in advance
2. **Account for Seasonality** - Ensure 2+ years of historical data if seasonal patterns exist
3. **Adjust for One-Time Events** - Flag unusual orders so they don't skew future forecasts
4. **Review Lead Times** - Shorter lead times = harder to forecast accurately

## Client Meeting Talking Points
- "Your current accuracy is [X]% which is [excellent/good/acceptable] for your product category"
- "To improve from 25% to 15%, we recommend [specific action]"
- "This change would reduce safety stock by approximately [Y]% and improve service levels"

## When to Escalate to Development
- Accuracy hasn't improved despite correct data input
- System performance degrades with large datasets (>5 years of data)
- Custom forecasting algorithm needed (rare, requires approval)`,
        isInternal: true,
        isPublished: true,
      },
    ];

    console.log("Creating internal KB articles...\n");

    // Drop problematic triggers temporarily
    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS kb_search_vector_trigger ON "KnowledgeBase"`);

    for (const article of internalArticles) {
      const existing = await prisma.knowledgeBase.findFirst({
        where: { slug: article.slug },
      });

      if (existing) {
        console.log(`⏭️  Skipping ${article.slug} (already exists)`);
        continue;
      }

      // Use raw SQL to bypass trigger issues
      await prisma.$executeRawUnsafe(
        `INSERT INTO "KnowledgeBase" (id, title, slug, category, content, "isInternal", "isPublished", "createdById", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        `kb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        article.title,
        article.slug,
        article.category,
        article.content,
        article.isInternal,
        article.isPublished,
        author.id
      );

      console.log(`✅ Created: ${article.title}`);
      console.log(`   Category: ${article.category}`);
      console.log(`   Slug: ${article.slug}\n`);
    }

    console.log("✅ Internal KB articles created successfully!");

    // Recreate the trigger
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION kb_search_vector_trigger() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector := setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') || setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER kb_search_vector_trigger BEFORE INSERT OR UPDATE ON "KnowledgeBase"
        FOR EACH ROW EXECUTE FUNCTION kb_search_vector_trigger()
    `);

    console.log("✅ Triggers recreated successfully!");
  } catch (error) {
    console.error("Error creating internal KB:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createInternalKB();

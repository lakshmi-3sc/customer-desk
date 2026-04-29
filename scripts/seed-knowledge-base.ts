import { prisma } from "@/lib/prisma";

const PLANNING_ARTICLES = [
  {
    slug: "get-started-planning",
    title: "Getting Started with Planning",
    category: "Production",
    content: `## Getting Started with Planning

Welcome! This guide helps you set up planning for your organization in 5 minutes.

### What is Planning?
Production Planning coordinates **what** you make, **when** you make it, and **what materials** you need.

### 3 Quick Steps
1. Define Your Products - Specify production time and link raw materials
2. Set Your Capacity - Enter machines, hours, and account for breaks
3. Create Your First Plan - Enter units and deadline, system suggests schedule

### Key Concepts
- **Demand** = How many units customers want
- **Capacity** = How many you can make
- **Lead Time** = How long it takes to make something
- **Safety Stock** = Extra inventory to prevent shortages`,
  },
  {
    slug: "raw-material-basics",
    title: "Raw Material Planning Basics",
    category: "RawMaterial",
    content: `## Raw Material Planning Basics

Raw materials are ingredients in your products. Good planning prevents stockouts and excess inventory.

### The Material Planning Flow
1. You decide to make 1000 units
2. System calculates materials needed using recipe/BOM
3. System checks inventory availability
4. System creates purchase orders if needed
5. Supplier delivers on time

### Understanding Your BOM
A BOM lists what goes into each product with exact quantities for scaling production.

### Setting Up Material Planning
1. Go to Materials → Add Material
2. Enter name and unit (kg, liters, units)
3. Set minimum stock level
4. Add suppliers and lead times
5. Set standard cost

### Planning Tips
- Review forecasts monthly
- Keep supplier lead times updated
- Maintain 2-3 weeks of safety stock
- Group purchases with same supplier`,
  },
  {
    slug: "demand-forecasting-101",
    title: "Demand Forecasting 101",
    category: "Production",
    content: `## Demand Forecasting 101

Forecasting answers: "How many units will we need?"

### Three Ways to Forecast
1. **Historical** - Use past sales (simple, good for stable products)
2. **Seasonal** - Apply adjustments for busy/slow periods
3. **Growth-Based** - Account for trending demand increase

### Forecast Process
1. Collect data from last 6-12 months
2. Identify pattern (seasonal, growing, stable)
3. Calculate forecast using appropriate method
4. Review with team for known changes
5. Publish plan to production team
6. Track actual vs. forecast to improve

### Common Mistakes to Avoid
- Forecasting only 1 month (too short)
- Ignoring known events
- Not updating when situations change
- Only looking at recent averages`,
  },
  {
    slug: "capacity-planning-guide",
    title: "Capacity Planning: Know Your Limits",
    category: "Production",
    content: `## Capacity Planning: Know Your Limits

Capacity is your maximum production output. Planning ensures you don't over-commit.

### Understanding Capacity Types
- **Theoretical** - Machine runs 24/7 (unrealistic)
- **Practical** - Account for maintenance and breaks (70-85% of theoretical)
- **Actual** - What you achieved last month (best for planning)

### Calculate Your Capacity
Formula: Machines × Hours/Day × Days/Month × Units/Hour

Example: 2 machines × 16 hours × 20 days × 50 units/hr = 32,000 units/month

### Identify Bottlenecks
Bottleneck = slowest production step. Entire line is limited to its speed.

Ways to fix: Add capacity, run longer, outsource, or redesign process.

### Planning Tip
Always verify: **Demand ≤ Capacity**
If not: add capacity, extend timeline, or subcontract`,
  },
  {
    slug: "supplier-management",
    title: "Managing Suppliers Effectively",
    category: "RawMaterial",
    content: `## Managing Suppliers Effectively

Your suppliers are critical to planning success.

### Key Supplier Metrics
- **Lead Time** - Order to delivery (keep updated!)
- **MOQ** - Minimum order quantity
- **On-Time Delivery** - Target 95%+
- **Quality** - Defect rate and inspection results

### Setting Up Suppliers
1. Go to Materials → Suppliers
2. Enter contact info
3. Add lead times for each material
4. Document minimum order quantities
5. Note special requirements

### Best Practices
- Work with multiple suppliers (reduces risk)
- Build relationships and share plans early
- Monitor performance monthly
- Plan ahead and give advance notice
- Track quality and delivery metrics

### What to Avoid
- Single sourcing critical materials
- Short notice changes
- Unrealistic demands`,
  },
  {
    slug: "saas-replenishment-explained",
    title: "SaaS Replenishment: Automated Supplies",
    category: "Replenishment",
    content: `## SaaS Replenishment: Automated Supplies

Subscription-based materials that arrive automatically on schedule.

### The Idea
Replace manual monthly orders with automatic delivery and fixed pricing.

### Real Example
Old way: Manual ordering, $8-12k/month, 3 hours admin time
New way: Auto-delivery, $8,500/month fixed, 5 minutes setup

### How It Works
1. Sign contract (base qty, price, delivery date)
2. System tracks your actual usage
3. Automatically adjust quantity if contract allows
4. Delivery continues without manual POs

### When to Use SaaS Replenishment
Good for: Regular use, high-volume, predictable demand
Not for: Expensive inventory, unpredictable demand, testing new materials

### Savings
- Ordering costs: 90% savings (no manual POs)
- Price discounts: 10-25% lower per unit
- Inventory costs: Reduced excess stock
- Admin time: Save hours per month`,
  },
  {
    slug: "scheduling-production",
    title: "Scheduling Production Runs",
    category: "Production",
    content: `## Scheduling Production Runs

Deciding WHEN and in WHAT ORDER to make products for maximum efficiency.

### Scheduling Strategies
1. **FIFO** - First in, first out (fair and simple)
2. **Fastest First** - Quick products first (clears backlog)
3. **Priority First** - Urgent orders first (urgent customers happy)
4. **Longest First** - Long jobs first (parallelizes work)

### The Scheduling Decision
Ask:
1. What's the deadline?
2. How long does it take?
3. When should it start?
4. Do we have materials?
5. Is capacity available?

### Execution Tips
- Communicate schedule to team
- Build buffer time before deadlines
- Plan setup/changeover time
- Track actual vs. planned times
- Use data to improve future scheduling`,
  },
  {
    slug: "handling-changes",
    title: "Managing Plan Changes",
    category: "Production",
    content: `## Managing Plan Changes

Plans are predictions. Reality changes. Here's how to handle it.

### Types of Changes
1. **Customer Adds Order** - Check capacity and materials
2. **Customer Reduces/Cancels** - Free up resources
3. **Customer Changes Deadline** - Reschedule accordingly
4. **Supplier Delays** - Impacts dependent production
5. **Equipment Breaks** - Emergency recovery needed

### Response Process
1. Assess impact (affected orders, delay amount)
2. Communicate immediately to customers
3. Adjust plan (reschedule, prioritize, reallocate)
4. Execute recovery (extra hours, accelerate non-critical work)

### Pro Tips
- Build 5-10% spare capacity as slack
- Keep plan visible to the team
- Track why changes happen
- Identify patterns to prevent future changes`,
  },
];

async function seedKnowledgeBase() {
  console.log("🌱 Seeding Knowledge Base articles...");

  try {
    // Get or create a system user
    let systemUser = await prisma.user.findFirst({
      where: { email: "kb-system@3scconnect.com" },
    });

    if (!systemUser) {
      systemUser = await prisma.user.create({
        data: {
          email: "kb-system@3scconnect.com",
          name: "KB System",
          password: "",
          role: "THREESC_ADMIN",
        },
      });
      console.log("✓ Created system user");
    }

    // Clear existing articles
    await prisma.knowledgeBase.deleteMany({
      where: { createdById: systemUser.id },
    });
    console.log("✓ Cleared existing articles");

    // Insert articles
    for (const article of PLANNING_ARTICLES) {
      await prisma.knowledgeBase.create({
        data: {
          slug: article.slug,
          title: article.title,
          content: article.content,
          category: article.category,
          createdById: systemUser.id,
          isPublished: true,
          isInternal: false,
        },
      });
      console.log(`✓ Created: ${article.title}`);
    }

    console.log("\n✅ Knowledge Base seeding complete!");
    console.log(`Total articles: ${PLANNING_ARTICLES.length}`);

    const byCategory = PLANNING_ARTICLES.reduce((acc, a) => {
      acc[a.category] = (acc[a.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log("\n📚 Articles by Category:");
    Object.entries(byCategory).forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count} articles`);
    });
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedKnowledgeBase();

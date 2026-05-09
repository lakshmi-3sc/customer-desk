import { prisma } from "@/lib/prisma";

async function addKnowledgeBase() {
  console.log("📚 Creating Knowledge Base articles...\n");

  // Get users and clients
  const sneha = await prisma.user.findUnique({ where: { email: "sneha.pillai@3sc.com" } });
  const colgate = await prisma.client.findFirst({ where: { name: "Colgate Palmolive" } });
  const modenik = await prisma.client.findFirst({ where: { name: "Modenik" } });

  if (!sneha || !colgate || !modenik) {
    console.error("Missing required data");
    return;
  }

  const articles = [
    {
      title: "How to Set Up Safety Stock Levels",
      content: `Safety stock is inventory held to protect against demand variability and supply uncertainty.

## Why Safety Stock Matters
- Prevents stockouts during demand spikes
- Absorbs supply delays
- Maintains service levels to customers

## Steps to Configure:
1. Analyze historical demand patterns (last 24 months)
2. Calculate service level required (95% = 1.65σ, 99% = 2.33σ)
3. Multiply by standard deviation of demand
4. Set minimum stock to safety stock level

## Best Practices:
- Review safety stock quarterly
- Adjust for seasonal patterns
- Monitor actual stockout incidents
- Balance carrying costs with service level`,
      category: "Replenishment Planning",
      clientId: colgate.id,
      createdById: sneha.id,
      isPublished: true,
      isInternal: false,
    },
    {
      title: "Optimizing Reorder Points (ROP)",
      content: `Reorder Point (ROP) is the inventory level at which a new purchase order is triggered.

## Formula:
ROP = (Average Daily Demand × Lead Time in Days) + Safety Stock

## Example:
- Daily demand: 50 units
- Lead time: 10 days
- Safety stock: 150 units
- ROP = (50 × 10) + 150 = 650 units

## Implementation Tips:
1. Account for supply chain variability
2. Adjust for seasonal demand changes
3. Monitor actual vs. projected lead times
4. Review ROP monthly

## Common Mistakes to Avoid:
- Setting ROP too low (causes stockouts)
- Not adjusting for seasonality
- Ignoring supply chain disruptions
- Manual calculation errors`,
      category: "Replenishment Planning",
      clientId: colgate.id,
      createdById: sneha.id,
      isPublished: true,
      isInternal: false,
    },
    {
      title: "Troubleshooting: Demand Forecast Accuracy",
      content: `If your demand forecasts are consistently off, follow this diagnostic guide.

## Check These First:
1. Data Quality - Are historical sales accurate?
2. Seasonality - Did you account for patterns?
3. Outliers - Remove anomalies
4. Lead Time - Is horizon aligned?

## Common Causes:
- Missing seasonal adjustments: 15-20% error
- Promotional periods not labeled: 25% error
- Inaccurate historical data: 30% error
- Ignoring trend changes: 40% error

## Solutions:
- Use exponential smoothing for trend
- Segment by product category
- Include external factors
- Validate with domain experts

## Validation:
- Check MAPE (Mean Absolute Percentage Error)
- Target: < 15% for mature products
- Target: < 25% for new products`,
      category: "Replenishment Planning",
      clientId: colgate.id,
      createdById: sneha.id,
      isPublished: true,
      isInternal: false,
    },
    {
      title: "Setting Up Production Schedules Effectively",
      content: `Master scheduling ensures resources are used efficiently and orders are met on time.

## Key Principles:
1. Capacity Planning - Never exceed capacity by >85%
2. Batch Sizing - Balance setup costs vs. inventory
3. Lead Time - Account for setup and run time
4. Buffer Time - Add 10-15% for downtime

## Scheduling Steps:
1. Confirm available capacity
2. Schedule high-priority first
3. Group similar products
4. Validate against constraints
5. Monitor execution

## Avoiding Bottlenecks:
- Identify constraint machines
- Schedule constraint first
- Work backward from due date
- Cross-train operators
- Maintain preventive schedule`,
      category: "Production Planning",
      clientId: modenik.id,
      createdById: sneha.id,
      isPublished: true,
      isInternal: false,
    },
    {
      title: "Quality Control Checkpoints in Manufacturing",
      content: `Implementing effective QC checkpoints reduces defect rates and rework costs.

## Standard QC Gates:
1. Raw Material Inspection - Check supplier documentation
2. In-Process QC - After critical operations
3. Final Inspection - Before packaging
4. Statistical Sampling - Per ISO 2859

## Defect Documentation:
- Log all defects with root cause
- Photo evidence for traceability
- Update QC database immediately
- Alert if > 2% defect rate

## Corrective Actions:
- Minor defects: Rework
- Major defects: Production halt
- Critical defects: Quarantine

## Metrics to Track:
- First Pass Yield (FPY)
- Defect Rate (%)
- Average Rework Cost
- Customer Returns`,
      category: "Production Planning",
      clientId: modenik.id,
      createdById: sneha.id,
      isPublished: true,
      isInternal: false,
    },
    {
      title: "Supplier Lead Time Management",
      content: `Accurate lead time data is critical for inventory and production planning.

## Tracking Lead Times:
1. Record PO date and delivery date
2. Calculate average (exclude outliers)
3. Track variability (std dev)
4. Monitor seasonal changes

## Lead Time Components:
- Procurement: 2-5 days
- Manufacturing: varies
- Transit: 5-20 days
- Customs/clearance: 1-3 days

## Managing Variability:
- Build safety stock for high-variability
- Diversify suppliers
- Negotiate fixed lead times
- Use freight forwarders

## Red Flags:
- Lead time increases > 20%
- Missed deliveries
- Quality issues
- Communication delays`,
      category: "Raw Material Planning",
      clientId: colgate.id,
      createdById: sneha.id,
      isPublished: true,
      isInternal: false,
    },
    {
      title: "Material Shortage Resolution Process",
      content: `Step-by-step guide to handle raw material shortages without halting production.

## Immediate Actions (Day 1):
1. Verify actual shortage vs. system error
2. Check alternate suppliers
3. Assess production impact
4. Notify stakeholders
5. Explore emergency procurement

## Short-term Solutions (Days 1-5):
- Expedited shipping from suppliers
- Emergency purchases (accept premium)
- Substitute materials (with approval)
- Reduce production pace

## Medium-term Solutions (Days 5-30):
- Source from backup suppliers
- Negotiate temporary price increases
- Implement rationing
- Accelerate shipments

## Prevention:
- Maintain 30-day safety stock
- Dual-source critical materials
- Monitor supplier health
- Weekly shortage reviews`,
      category: "Raw Material Planning",
      clientId: colgate.id,
      createdById: sneha.id,
      isPublished: true,
      isInternal: false,
    },
    {
      title: "System Best Practices: Data Entry & Accuracy",
      content: `Maintaining data accuracy ensures reliable planning and forecasting.

## Daily Checklist:
- Enter sales transactions within 24 hours
- Update inventory counts after counts
- Record supplier lead time changes
- Log machine downtime with reason
- Update demand forecasts weekly

## Common Data Errors:
1. Transposed quantities
2. Wrong product codes
3. Incorrect UOM
4. Stale forecast data
5. Unrecorded returns

## Validation Rules:
- Quantity must be > 0
- Product code must exist
- Date cannot be future
- Supplier lead time: 5-45 days
- Forecast variance < 50%

## Reporting Issues:
- Screenshot error
- Note steps to reproduce
- Report to administrator
- Check backup availability`,
      category: "General",
      clientId: colgate.id,
      createdById: sneha.id,
      isPublished: true,
      isInternal: false,
    },
  ];

  let created = 0;
  for (const article of articles) {
    await prisma.knowledgeBase.create({ data: article });
    console.log(`✓ Created: "${article.title}"`);
    created++;
  }

  console.log(`\n✅ Created ${created} Knowledge Base articles!`);
}

addKnowledgeBase()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

/**
 * Simple seed script - Step by step
 * Run with: npx tsx lib/jobs/simple-seed.ts
 */

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { generateTicketKey } from "@/lib/ticket-key";

// Helper function to calculate SLA due date based on priority
function calculateSlaDueDate(priority: string, createdAt: Date): Date {
  const slaHours: Record<string, number> = {
    CRITICAL: 4,    // 4 hours resolution time
    HIGH: 24,       // 24 hours resolution time
    MEDIUM: 72,     // 72 hours resolution time
    LOW: 168,       // 7 days resolution time
  };
  const hours = slaHours[priority] || 72;
  return new Date(createdAt.getTime() + hours * 60 * 60 * 1000);
}

async function seed() {
  try {
    console.log("🧹 Cleaning database...");
    await prisma.comment.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.issueHistory.deleteMany({});
    await prisma.issueAttachment.deleteMany({});
    await prisma.issue.deleteMany({});
    await prisma.milestone.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.clientMember.deleteMany({});
    await prisma.client.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.slaPolicy.deleteMany({});
    console.log("✅ Database cleaned\n");

    // ============== STEP 1: CREATE USERS ==============
    console.log("📝 STEP 1: Creating users...");

    const users = await Promise.all([
      prisma.user.create({
        data: {
          email: "admin@3sc.com",
          name: "3SC Admin",
          password: await bcrypt.hash("password123", 10),
          role: "THREESC_ADMIN",
          isActive: true,
        },
      }),
      prisma.user.create({
        data: {
          email: "meera.rao@3sc.com",
          name: "Meera Rao",
          password: await bcrypt.hash("password123", 10),
          role: "THREESC_LEAD",
          isActive: true,
        },
      }),
      prisma.user.create({
        data: {
          email: "sana@3sc.com",
          name: "Sana Mirza",
          password: await bcrypt.hash("password123", 10),
          role: "THREESC_LEAD",
          isActive: true,
        },
      }),
      prisma.user.create({
        data: {
          email: "sneha.pillai@3sc.com",
          name: "Sneha Pillai",
          password: await bcrypt.hash("password123", 10),
          role: "THREESC_AGENT",
          isActive: true,
        },
      }),
      prisma.user.create({
        data: {
          email: "kiran.das@3sc.com",
          name: "Kiran Das",
          password: await bcrypt.hash("password123", 10),
          role: "THREESC_AGENT",
          isActive: true,
        },
      }),
      prisma.user.create({
        data: {
          email: "arjun.nair@3sc.com",
          name: "Arjun Nair",
          password: await bcrypt.hash("password123", 10),
          role: "THREESC_AGENT",
          isActive: true,
        },
      }),
      prisma.user.create({
        data: {
          email: "ravi@3sc.com",
          name: "Ravi Kumar",
          password: await bcrypt.hash("password123", 10),
          role: "THREESC_AGENT",
          isActive: true,
        },
      }),
      prisma.user.create({
        data: {
          email: "anjali.mehta@colgate.com",
          name: "Anjali Mehta",
          password: await bcrypt.hash("password123", 10),
          role: "CLIENT_ADMIN",
          isActive: true,
        },
      }),
      prisma.user.create({
        data: {
          email: "arjun@colgate.com",
          name: "Arjun Mehta",
          password: await bcrypt.hash("password123", 10),
          role: "CLIENT_ADMIN",
          isActive: true,
        },
      }),
      prisma.user.create({
        data: {
          email: "rohan.verma@colgate.com",
          name: "Rohan Verma",
          password: await bcrypt.hash("password123", 10),
          role: "CLIENT_USER",
          isActive: true,
        },
      }),
      prisma.user.create({
        data: {
          email: "neha@colgate.com",
          name: "Neha Sharma",
          password: await bcrypt.hash("password123", 10),
          role: "CLIENT_USER",
          isActive: true,
        },
      }),
      prisma.user.create({
        data: {
          email: "neha.joshi@modenik.com",
          name: "Neha Joshi",
          password: await bcrypt.hash("password123", 10),
          role: "CLIENT_ADMIN",
          isActive: true,
        },
      }),
      prisma.user.create({
        data: {
          email: "amit.kulkarni@modenik.com",
          name: "Amit Kulkarni",
          password: await bcrypt.hash("password123", 10),
          role: "CLIENT_USER",
          isActive: true,
        },
      }),
    ]);

    const [admin3sc, meera, sana, sneha, kiran, arjunNair, ravi, anjali, arjun, rohan, neha, nehaJoshi, amit] = users;
    console.log(`✅ Created ${users.length} users\n`);

    // ============== STEP 2: CREATE CLIENTS ==============
    console.log("🏢 STEP 2: Creating clients...");

    const clients = await Promise.all([
      prisma.client.create({
        data: {
          name: "Colgate Palmolive",
          industry: "Consumer Goods",
          isActive: true,
        },
      }),
      prisma.client.create({
        data: {
          name: "Modenik",
          industry: "Fashion & Apparel",
          isActive: true,
        },
      }),
    ]);

    const [colgate, modenik] = clients;
    console.log(`✅ Created ${clients.length} clients\n`);

    // ============== STEP 3: CREATE PROJECTS ==============
    console.log("📊 STEP 3: Creating projects...");

    const projects = await Promise.all([
      prisma.project.create({
        data: {
          name: "Replenishment Planning",
          description: "Inventory replenishment and stock optimization system",
          clientId: colgate.id,
          status: "ACTIVE",
          createdBy: admin3sc.id,
          assignedLead: meera.id,
        },
      }),
      prisma.project.create({
        data: {
          name: "Production Planning",
          description: "Production scheduling and resource allocation",
          clientId: colgate.id,
          status: "ACTIVE",
          createdBy: admin3sc.id,
          assignedLead: sana.id,
        },
      }),
      prisma.project.create({
        data: {
          name: "Raw Material Planning",
          description: "Raw material procurement and demand forecasting",
          clientId: colgate.id,
          status: "ACTIVE",
          createdBy: admin3sc.id,
          assignedLead: meera.id,
        },
      }),
      prisma.project.create({
        data: {
          name: "Replenishment Planning",
          description: "Fashion inventory replenishment system",
          clientId: modenik.id,
          status: "ACTIVE",
          createdBy: admin3sc.id,
          assignedLead: sana.id,
        },
      }),
      prisma.project.create({
        data: {
          name: "Production Planning",
          description: "Apparel manufacturing and production management",
          clientId: modenik.id,
          status: "ACTIVE",
          createdBy: admin3sc.id,
          assignedLead: meera.id,
        },
      }),
    ]);

    const [replenColgate, prodColgate, rawmatColgate, replenModenik, prodModenik] = projects;
    console.log(`✅ Created ${projects.length} projects\n`);

    // ============== STEP 4: CREATE CLIENT MEMBERSHIPS ==============
    console.log("👥 STEP 4: Creating client memberships...");

    await Promise.all([
      prisma.clientMember.create({ data: { clientId: colgate.id, userId: anjali.id } }),
      prisma.clientMember.create({ data: { clientId: colgate.id, userId: arjun.id } }),
      prisma.clientMember.create({ data: { clientId: colgate.id, userId: rohan.id } }),
      prisma.clientMember.create({ data: { clientId: colgate.id, userId: neha.id } }),
      prisma.clientMember.create({ data: { clientId: modenik.id, userId: nehaJoshi.id } }),
      prisma.clientMember.create({ data: { clientId: modenik.id, userId: amit.id } }),
    ]);

    console.log("✅ Created client memberships\n");

    // ============== STEP 5: CREATE ISSUES ==============
    console.log("🎫 STEP 5: Creating issues with realistic scenarios...\n");

    // Create issues one by one with proper category values and ticketKeys
    const ticketKey1 = await generateTicketKey(replenColgate.id);
    const createdAt1 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const issue1 = await prisma.issue.create({
      data: {
        title: "Stock depletion alert not triggering for SKU-001",
        description: "The replenishment system is not sending alerts when stock falls below the safety threshold. This is causing stockouts.",
        category: "BUG",
        priority: "CRITICAL",
        status: "RESOLVED",
        clientId: colgate.id,
        projectId: replenColgate.id,
        raisedById: rohan.id,
        assignedToId: sneha.id,
        createdAt: createdAt1,
        resolvedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        slaDueAt: calculateSlaDueDate("CRITICAL", createdAt1),
        ticketKey: ticketKey1,
      },
    });
    console.log(`✓ Issue 1: RESOLVED - Stock depletion alert (${ticketKey1})`);

    const ticketKey2 = await generateTicketKey(replenColgate.id);
    const issue2 = await prisma.issue.create({
      data: {
        title: "Slow performance when generating replenishment reports",
        description: "The replenishment forecast report is taking 45+ minutes to generate. This blocks planning decisions.",
        category: "BUG",
        priority: "HIGH",
        status: "OPEN",
        clientId: colgate.id,
        projectId: replenColgate.id,
        raisedById: anjali.id,
        assignedToId: kiran.id,
        ticketKey: ticketKey2,
      },
    });
    console.log(`✓ Issue 2: OPEN - Performance issue (${ticketKey2})`);

    const ticketKey3 = await generateTicketKey(replenColgate.id);
    const issue3 = await prisma.issue.create({
      data: {
        title: "Export replenishment data to CSV failing",
        description: "Users cannot export replenishment recommendations to CSV format. JSON export works but CSV throws error.",
        category: "BUG",
        priority: "HIGH",
        status: "ACKNOWLEDGED",
        clientId: colgate.id,
        projectId: replenColgate.id,
        raisedById: neha.id,
        assignedToId: arjunNair.id,
        ticketKey: ticketKey3,
      },
    });
    console.log(`✓ Issue 3: ACKNOWLEDGED - CSV export bug (${ticketKey3})`);

    const ticketKey4 = await generateTicketKey(replenColgate.id);
    const issue4 = await prisma.issue.create({
      data: {
        title: "Need dashboard visualization for replenishment trends",
        description: "Add a dashboard showing 90-day replenishment trend analysis with visual charts and SKU velocity analysis.",
        category: "FEATURE_REQUEST",
        priority: "MEDIUM",
        status: "IN_PROGRESS",
        clientId: colgate.id,
        projectId: replenColgate.id,
        raisedById: rohan.id,
        assignedToId: ravi.id,
        ticketKey: ticketKey4,
      },
    });
    console.log(`✓ Issue 4: IN_PROGRESS - Dashboard feature (${ticketKey4})`);

    const ticketKey5 = await generateTicketKey(prodColgate.id);
    const issue5 = await prisma.issue.create({
      data: {
        title: "Production batch calculation gives incorrect quantities",
        description: "Batch calculation algorithm produces wrong quantities for multi-component products. Rounding errors causing material shortages.",
        category: "BUG",
        priority: "CRITICAL",
        status: "RESOLVED",
        clientId: colgate.id,
        projectId: prodColgate.id,
        raisedById: anjali.id,
        assignedToId: sneha.id,
        resolvedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        ticketKey: ticketKey5,
      },
    });
    console.log(`✓ Issue 5: RESOLVED - Batch calculation bug (${ticketKey5})`);

    const ticketKey6 = await generateTicketKey(prodColgate.id);
    const issue6 = await prisma.issue.create({
      data: {
        title: "Machine downtime tracking incomplete",
        description: "System is not capturing all machine downtime events. Some maintenance windows are being skipped.",
        category: "BUG",
        priority: "HIGH",
        status: "CLOSED",
        clientId: colgate.id,
        projectId: prodColgate.id,
        raisedById: neha.id,
        assignedToId: kiran.id,
        closedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        ticketKey: ticketKey6,
      },
    });
    console.log(`✓ Issue 6: CLOSED - Machine downtime (${ticketKey6})`);

    const ticketKey7 = await generateTicketKey(rawmatColgate.id);
    const issue7 = await prisma.issue.create({
      data: {
        title: "Supplier lead time not updating in forecasts",
        description: "Raw material forecasts using outdated supplier lead times. Supplier A's lead time changed from 14 to 21 days.",
        category: "BUG",
        priority: "HIGH",
        status: "RESOLVED",
        clientId: colgate.id,
        projectId: rawmatColgate.id,
        raisedById: rohan.id,
        assignedToId: arjunNair.id,
        resolvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        ticketKey: ticketKey7,
      },
    });
    console.log(`✓ Issue 7: RESOLVED - Supplier lead time (${ticketKey7})`);

    const ticketKey8 = await generateTicketKey(rawmatColgate.id);
    const issue8 = await prisma.issue.create({
      data: {
        title: "Access denied error for raw material reports",
        description: "Some CLIENT_USER users cannot access raw material planning reports even though they should have read access.",
        category: "BUG",
        priority: "HIGH",
        status: "OPEN",
        clientId: colgate.id,
        projectId: rawmatColgate.id,
        raisedById: anjali.id,
        assignedToId: ravi.id,
        ticketKey: ticketKey8,
      },
    });
    console.log(`✓ Issue 8: OPEN - Access permission issue (${ticketKey8})`);

    const ticketKey9 = await generateTicketKey(replenModenik.id);
    const issue9 = await prisma.issue.create({
      data: {
        title: "Seasonal demand prediction accuracy is low",
        description: "ML model for seasonal demand is only 62% accurate. Forecasts are off by 30-40% during peak seasons.",
        category: "BUG",
        priority: "HIGH",
        status: "RESOLVED",
        clientId: modenik.id,
        projectId: replenModenik.id,
        raisedById: amit.id,
        assignedToId: sneha.id,
        resolvedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        ticketKey: ticketKey9,
      },
    });
    console.log(`✓ Issue 9: RESOLVED - Demand prediction (${ticketKey9})`);

    const ticketKey10 = await generateTicketKey(replenModenik.id);
    const issue10 = await prisma.issue.create({
      data: {
        title: "Add color and size variant tracking to replenishment",
        description: "Need granular tracking for color, size, and material type variants for fashion items.",
        category: "FEATURE_REQUEST",
        priority: "HIGH",
        status: "IN_PROGRESS",
        clientId: modenik.id,
        projectId: replenModenik.id,
        raisedById: nehaJoshi.id,
        assignedToId: ravi.id,
        ticketKey: ticketKey10,
      },
    });
    console.log(`✓ Issue 10: IN_PROGRESS - Variant tracking (${ticketKey10})`);

    const ticketKey11 = await generateTicketKey(prodModenik.id);
    const issue11 = await prisma.issue.create({
      data: {
        title: "Production schedule conflicts with resource constraints",
        description: "Planner schedules 3 concurrent jobs on equipment that can only handle 1. System should check resource availability.",
        category: "BUG",
        priority: "HIGH",
        status: "OPEN",
        clientId: modenik.id,
        projectId: prodModenik.id,
        raisedById: amit.id,
        assignedToId: kiran.id,
        ticketKey: ticketKey11,
      },
    });
    console.log(`✓ Issue 11: OPEN - Resource conflict (${ticketKey11})`);

    const ticketKey12 = await generateTicketKey(prodModenik.id);
    const issue12 = await prisma.issue.create({
      data: {
        title: "Quality control checkpoints missing from production workflow",
        description: "Add mandatory QC checkpoints after cutting, stitching, and finishing stages with pass/fail gates.",
        category: "FEATURE_REQUEST",
        priority: "MEDIUM",
        status: "ACKNOWLEDGED",
        clientId: modenik.id,
        projectId: prodModenik.id,
        raisedById: nehaJoshi.id,
        assignedToId: arjunNair.id,
        ticketKey: ticketKey12,
      },
    });
    console.log(`✓ Issue 12: ACKNOWLEDGED - QC checkpoints (${ticketKey12})\n`);

    // ============== STEP 6: ADD COMMENTS TO RESOLVED ISSUES ==============
    console.log("💬 STEP 6: Adding resolution comments...\n");

    await prisma.comment.create({
      data: {
        issueId: issue1.id,
        authorId: sneha.id,
        content: "Fixed: Changed alert threshold check from 'less than' to 'less than or equal to'. Alerts now trigger correctly at threshold levels.",
        isInternal: false,
      },
    });
    console.log("✓ Comment added to Issue 1");

    await prisma.comment.create({
      data: {
        issueId: issue5.id,
        authorId: sneha.id,
        content: "Fixed rounding error in BatchCalculator. Changed Math.floor() to Math.round() with proper decimal precision. Tested - now accurate.",
        isInternal: false,
      },
    });
    console.log("✓ Comment added to Issue 5");

    await prisma.comment.create({
      data: {
        issueId: issue7.id,
        authorId: arjunNair.id,
        content: "Updated Supplier A lead time from 14 to 21 days in database. Regenerated forecasts. Forecast now correct for 21-day lead time.",
        isInternal: false,
      },
    });
    console.log("✓ Comment added to Issue 7");

    await prisma.comment.create({
      data: {
        issueId: issue9.id,
        authorId: sneha.id,
        content: "Improved ML model with fashion-specific features and 5-year training data. Accuracy improved from 62% to 87% during peak seasons.",
        isInternal: false,
      },
    });
    console.log("✓ Comment added to Issue 9\n");

    // ============== STEP 7: CREATE SLA POLICIES ==============
    console.log("⏱️  STEP 7: Creating SLA policies...\n");

    await Promise.all([
      prisma.slaPolicy.create({
        data: { priority: "CRITICAL", responseTime: 1, resolutionTime: 4 },
      }),
      prisma.slaPolicy.create({
        data: { priority: "HIGH", responseTime: 4, resolutionTime: 24 },
      }),
      prisma.slaPolicy.create({
        data: { priority: "MEDIUM", responseTime: 8, resolutionTime: 72 },
      }),
      prisma.slaPolicy.create({
        data: { priority: "LOW", responseTime: 24, resolutionTime: 168 },
      }),
    ]);

    console.log("✅ Created SLA policies\n");

    console.log("═══════════════════════════════════════════════════");
    console.log("✨ DEMO DATA SUCCESSFULLY SEEDED!");
    console.log("═══════════════════════════════════════════════════\n");

    console.log("📊 Summary:");
    console.log("  ✓ 13 Users (3SC + Colgate + Modenik)");
    console.log("  ✓ 2 Clients");
    console.log("  ✓ 5 Projects");
    console.log("  ✓ 12 Issues (all statuses)");
    console.log("  ✓ 4 Resolution comments");
    console.log("  ✓ 4 SLA Policies\n");

    console.log("🔐 Test Credentials:");
    console.log("  • rohan.verma@colgate.com / password123 (CLIENT_USER)");
    console.log("  • anjali.mehta@colgate.com / password123 (CLIENT_ADMIN)");
    console.log("  • sneha.pillai@3sc.com / password123 (THREESC_AGENT)\n");
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seed();

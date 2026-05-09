/**
 * Seed script for demo data
 * Creates users, clients, projects, and realistic SaaS-related issues
 * Run with: npx tsx lib/jobs/seed-demo-data.ts
 */

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function seedDemoData() {
  console.log("🌱 Starting demo data seed...\n");

  try {
    // ============== CREATE USERS ==============
    console.log("📝 Creating users...");

    const users = await Promise.all([
      // 3SC Users
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
      // Colgate Users
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
      // Modenik Users
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
    console.log("✅ Created 13 users\n");

    // ============== CREATE CLIENTS ==============
    console.log("🏢 Creating clients...");

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
    console.log("✅ Created 2 clients\n");

    // ============== CREATE CLIENT MEMBERS ==============
    console.log("👥 Creating client memberships...");

    await Promise.all([
      // Colgate members
      prisma.clientMember.create({ data: { clientId: colgate.id, userId: anjali.id } }),
      prisma.clientMember.create({ data: { clientId: colgate.id, userId: arjun.id } }),
      prisma.clientMember.create({ data: { clientId: colgate.id, userId: rohan.id } }),
      prisma.clientMember.create({ data: { clientId: colgate.id, userId: neha.id } }),
      // Modenik members
      prisma.clientMember.create({ data: { clientId: modenik.id, userId: nehaJoshi.id } }),
      prisma.clientMember.create({ data: { clientId: modenik.id, userId: amit.id } }),
    ]);

    console.log("✅ Created client memberships\n");

    // ============== CREATE PROJECTS ==============
    console.log("📊 Creating projects...");

    const projects = await Promise.all([
      // Colgate Projects
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
      // Modenik Projects
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
    console.log("✅ Created 5 projects\n");

    // ============== CREATE ISSUES ==============
    console.log("🎫 Creating issues...\n");

    const issues: any[] = [];

    // COLGATE - Replenishment - RESOLVED
    const issue1 = await prisma.issue.create({
      data: {
        title: "Stock depletion alert not triggering for SKU-001",
        description: "The replenishment system is not sending alerts when stock falls below the safety threshold for SKU-001 (Colgate Toothpaste). This is causing stockouts in warehouses.",
        category: "BUG",
        priority: "CRITICAL",
        status: "RESOLVED",
        clientId: colgate.id,
        projectId: replenColgate.id,
        raisedById: rohan.id,
        assignedToId: sneha.id,
        resolvedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    });
    issues.push(issue1);

    // COLGATE - Replenishment - OPEN
    const issue2 = await prisma.issue.create({
      data: {
        title: "Slow performance when generating replenishment reports",
        description: "The replenishment forecast report for Q2 is taking 45+ minutes to generate. This blocks our planning team from making timely decisions.",
        category: "PERFORMANCE",
        priority: "HIGH",
        status: "OPEN",
        clientId: colgate.id,
        projectId: replenColgate.id,
        raisedById: anjali.id,
        assignedToId: kiran.id,
      },
    });
    issues.push(issue2);

    // COLGATE - Replenishment - ACKNOWLEDGED
    const issue3 = await prisma.issue.create({
      data: {
        title: "Export replenishment data to CSV failing",
        description: "Users cannot export replenishment recommendations to CSV format. The feature works for JSON but CSV export throws an error.",
        category: "BUG",
        priority: "HIGH",
        status: "ACKNOWLEDGED",
        clientId: colgate.id,
        projectId: replenColgate.id,
        raisedById: neha.id,
        assignedToId: arjunNair.id,
      },
    });
    issues.push(issue3);

    // COLGATE - Replenishment - IN_PROGRESS
    const issue4 = await prisma.issue.create({
      data: {
        title: "Need dashboard visualization for replenishment trends",
        description: "Add a dashboard showing 90-day replenishment trend analysis with visual charts. Should display: replenishment frequency by warehouse, cost trends, and SKU velocity analysis.",
        category: "FEATURE_REQUEST",
        priority: "MEDIUM",
        status: "IN_PROGRESS",
        clientId: colgate.id,
        projectId: replenColgate.id,
        raisedById: rohan.id,
        assignedToId: ravi.id,
      },
    });
    issues.push(issue4);

    // COLGATE - Production - RESOLVED
    const issue5 = await prisma.issue.create({
      data: {
        title: "Production batch calculation gives incorrect quantities",
        description: "The batch calculation algorithm is producing wrong quantities for multi-component products. For example, a batch of 1000 units should require 2000kg of ingredient A, but the system shows 1800kg.",
        category: "BUG",
        priority: "CRITICAL",
        status: "RESOLVED",
        clientId: colgate.id,
        projectId: prodColgate.id,
        raisedById: anjali.id,
        assignedToId: sneha.id,
        resolvedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      },
    });
    issues.push(issue5);

    // COLGATE - Production - CLOSED
    const issue6 = await prisma.issue.create({
      data: {
        title: "Machine downtime tracking incomplete",
        description: "The production planning module is not capturing all machine downtime events. Some maintenance windows are being skipped, leading to unrealistic production schedules.",
        category: "DATA_ACCURACY",
        priority: "HIGH",
        status: "CLOSED",
        clientId: colgate.id,
        projectId: prodColgate.id,
        raisedById: neha.id,
        assignedToId: kiran.id,
        closedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    });
    issues.push(issue6);

    // COLGATE - Raw Material - RESOLVED
    const issue7 = await prisma.issue.create({
      data: {
        title: "Supplier lead time not updating in forecasts",
        description: "Raw material demand forecasts are using outdated supplier lead times. Supplier A's lead time changed from 14 days to 21 days last month, but the system is still using 14 days.",
        category: "DATA_ACCURACY",
        priority: "HIGH",
        status: "RESOLVED",
        clientId: colgate.id,
        projectId: rawmatColgate.id,
        raisedById: rohan.id,
        assignedToId: arjunNair.id,
        resolvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    });
    issues.push(issue7);

    // COLGATE - Raw Material - OPEN
    const issue8 = await prisma.issue.create({
      data: {
        title: "Access denied error for raw material reports",
        description: "Some users with CLIENT_USER role cannot access raw material planning reports even though they should have read access.",
        category: "ACCESS_SECURITY",
        priority: "HIGH",
        status: "OPEN",
        clientId: colgate.id,
        projectId: rawmatColgate.id,
        raisedById: anjali.id,
        assignedToId: ravi.id,
      },
    });
    issues.push(issue8);

    // MODENIK - Replenishment - RESOLVED
    const issue9 = await prisma.issue.create({
      data: {
        title: "Seasonal demand prediction accuracy is low",
        description: "The ML model for predicting seasonal demand in fashion is only 62% accurate. During peak seasons, forecasts are often off by 30-40%.",
        category: "BUG",
        priority: "HIGH",
        status: "RESOLVED",
        clientId: modenik.id,
        projectId: replenModenik.id,
        raisedById: amit.id,
        assignedToId: sneha.id,
        resolvedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
    });
    issues.push(issue9);

    // MODENIK - Replenishment - IN_PROGRESS
    const issue10 = await prisma.issue.create({
      data: {
        title: "Add color and size variant tracking to replenishment",
        description: "Currently, the replenishment system treats all variants of a product as one SKU. We need granular tracking for: color (red, blue, black), size (S, M, L, XL).",
        category: "FEATURE_REQUEST",
        priority: "HIGH",
        status: "IN_PROGRESS",
        clientId: modenik.id,
        projectId: replenModenik.id,
        raisedById: nehaJoshi.id,
        assignedToId: ravi.id,
      },
    });
    issues.push(issue10);

    // MODENIK - Production - OPEN
    const issue11 = await prisma.issue.create({
      data: {
        title: "Production schedule conflicts with resource constraints",
        description: "The production planner sometimes schedules 3 concurrent jobs on equipment that can only handle 1. The system should check resource availability before scheduling.",
        category: "BUG",
        priority: "HIGH",
        status: "OPEN",
        clientId: modenik.id,
        projectId: prodModenik.id,
        raisedById: amit.id,
        assignedToId: kiran.id,
      },
    });
    issues.push(issue11);

    // MODENIK - Production - ACKNOWLEDGED
    const issue12 = await prisma.issue.create({
      data: {
        title: "Quality control checkpoints missing from production workflow",
        description: "The production planning doesn't include mandatory QC checkpoints between stages. We need to add quality checks after cutting, stitching, and finishing.",
        category: "FEATURE_REQUEST",
        priority: "MEDIUM",
        status: "ACKNOWLEDGED",
        clientId: modenik.id,
        projectId: prodModenik.id,
        raisedById: nehaJoshi.id,
        assignedToId: arjunNair.id,
      },
    });
    issues.push(issue12);

    console.log("✅ Created 12 issues\n");

    // ============== ADD COMMENTS TO RESOLVED ISSUES ==============
    console.log("💬 Adding resolution comments...\n");

    // Issue 1: Stock depletion alert fix
    await prisma.comment.create({
      data: {
        issueId: issues[0].id,
        authorId: sneha.id,
        content: "Root cause identified: The alert threshold check was using 'less than' instead of 'less than or equal to'. Fixed the comparison operator in AlertTrigger.ts line 234. Alerts now trigger correctly at threshold.",
        isInternal: false,
      },
    });

    // Issue 5: Production batch calculation fix
    await prisma.comment.create({
      data: {
        issueId: issues[4].id,
        authorId: sneha.id,
        content: "Found the issue in BatchCalculator.calculateMaterials() - there was a rounding error. Changed Math.floor() to Math.round() with proper decimal precision handling. Tested with multiple products - now accurate.",
        isInternal: false,
      },
    });

    // Issue 7: Supplier lead time update
    await prisma.comment.create({
      data: {
        issueId: issues[6].id,
        authorId: arjunNair.id,
        content: "Updated Supplier A lead time from 14 to 21 days in master database. Created audit log entry with effective date. Regenerated demand forecast for next 60 days. Forecast now correctly accounts for 21-day lead time.",
        isInternal: false,
      },
    });

    // Issue 9: Seasonal demand prediction
    await prisma.comment.create({
      data: {
        issueId: issues[8].id,
        authorId: sneha.id,
        content: "Improved seasonal demand prediction by adding historical seasonal indices for Indian festivals and fashion-specific features. Increased training data from 2 to 5 years. Accuracy improved from 62% to 87% during peak seasons.",
        isInternal: false,
      },
    });

    console.log("✅ Added resolution comments\n");

    // ============== CREATE SLA POLICIES ==============
    console.log("⏱️  Creating SLA policies...");

    await Promise.all([
      prisma.slaPolicy.create({
        data: {
          priority: "CRITICAL",
          responseTime: 1,
          resolutionTime: 4,
        },
      }),
      prisma.slaPolicy.create({
        data: {
          priority: "HIGH",
          responseTime: 4,
          resolutionTime: 24,
        },
      }),
      prisma.slaPolicy.create({
        data: {
          priority: "MEDIUM",
          responseTime: 8,
          resolutionTime: 72,
        },
      }),
      prisma.slaPolicy.create({
        data: {
          priority: "LOW",
          responseTime: 24,
          resolutionTime: 168,
        },
      }),
    ]);

    console.log("✅ Created SLA policies\n");

    console.log("════════════════════════════════════════");
    console.log("✨ DEMO DATA SEED COMPLETED!");
    console.log("════════════════════════════════════════\n");

    console.log("📊 Summary:");
    console.log("✅ 13 Users created (3SC + Colgate + Modenik)");
    console.log("✅ 2 Clients created (Colgate Palmolive, Modenik)");
    console.log("✅ 5 Projects created (3 for Colgate, 2 for Modenik)");
    console.log("✅ 12 Issues created with all statuses:");
    console.log("   - 3 RESOLVED (with solution comments)");
    console.log("   - 3 OPEN");
    console.log("   - 1 ACKNOWLEDGED");
    console.log("   - 3 IN_PROGRESS");
    console.log("   - 1 CLOSED");
    console.log("✅ 4 SLA Policies created\n");

    console.log("🔐 Test Credentials:");
    console.log("├─ Client User (Colgate): rohan.verma@colgate.com / password123");
    console.log("├─ Client Admin (Colgate): anjali.mehta@colgate.com / password123");
    console.log("├─ Client User (Modenik): amit.kulkarni@modenik.com / password123");
    console.log("├─ 3SC Agent: sneha.pillai@3sc.com / password123");
    console.log("├─ 3SC Lead: meera.rao@3sc.com / password123");
    console.log("└─ 3SC Admin: admin@3sc.com / password123\n");
  } catch (error) {
    console.error("❌ Error seeding data:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedDemoData();

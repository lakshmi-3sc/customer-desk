import { prisma } from "@/lib/prisma";
import * as fs from "fs";
import * as path from "path";

async function restoreDatabase(backupFile: string) {
  console.log("🔄 Starting database restore...\n");

  if (!backupFile) {
    console.error("❌ Please provide a backup file path");
    console.error("Usage: npx tsx scripts/restore-db.ts <backup-file>");
    console.error("Example: npx tsx scripts/restore-db.ts backups/backup-2026-05-10.json");
    process.exit(1);
  }

  try {
    // Read backup file
    if (!fs.existsSync(backupFile)) {
      console.error(`❌ Backup file not found: ${backupFile}`);
      process.exit(1);
    }

    console.log(`📖 Reading backup from: ${backupFile}`);
    const backupData = JSON.parse(fs.readFileSync(backupFile, "utf-8"));

    if (!backupData.data) {
      console.error("❌ Invalid backup file format");
      process.exit(1);
    }

    const {
      users, clients, clientMembers, projects, milestones, slaPolicies,
      issues, similarResolutions, issueAttachments, comments, notifications,
      issueHistory, knowledgeBase, knowledgeBaseFeedback, summaries
    } = backupData.data;

    console.log("\n⚠️  WARNING: This will DELETE all existing data and restore from backup!");
    console.log("Restore plan:");
    console.log(`  • Clear all tables`);
    console.log(`  • Restore ${users?.length || 0} users`);
    console.log(`  • Restore ${clients?.length || 0} clients`);
    console.log(`  • Restore ${clientMembers?.length || 0} client members`);
    console.log(`  • Restore ${projects?.length || 0} projects`);
    console.log(`  • Restore ${milestones?.length || 0} milestones`);
    console.log(`  • Restore ${slaPolicies?.length || 0} SLA policies`);
    console.log(`  • Restore ${issues?.length || 0} issues`);
    console.log(`  • Restore ${similarResolutions?.length || 0} similar resolutions`);
    console.log(`  • Restore ${issueAttachments?.length || 0} attachments`);
    console.log(`  • Restore ${comments?.length || 0} comments`);
    console.log(`  • Restore ${notifications?.length || 0} notifications`);
    console.log(`  • Restore ${issueHistory?.length || 0} history records`);
    console.log(`  • Restore ${knowledgeBase?.length || 0} KB articles`);
    console.log(`  • Restore ${knowledgeBaseFeedback?.length || 0} KB feedback`);
    console.log(`  • Restore ${summaries?.length || 0} summaries`);
    console.log("\n⏸️  Proceeding in 5 seconds... Press Ctrl+C to cancel\n");

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Helper function to safely delete, skip if table doesn't exist
    const safeDelete = async (name: string, prismaModel: any): Promise<void> => {
      try {
        await prismaModel.deleteMany({});
      } catch (err: any) {
        if (err.code === 'P2021') {
          // Table doesn't exist, skip silently
          return;
        }
        throw err;
      }
    };

    // Delete all existing data (in reverse order of dependencies)
    console.log("🧹 Clearing existing data...");
    await safeDelete("KB feedback", prisma.knowledgeBaseFeedback);
    await safeDelete("similar resolutions", prisma.similarResolution);
    await safeDelete("issue history", prisma.issueHistory);
    await safeDelete("notifications", prisma.notification);
    await safeDelete("issue attachments", prisma.issueAttachment);
    await safeDelete("comments", prisma.comment);
    await safeDelete("issues", prisma.issue);
    await safeDelete("summaries", prisma.summary);
    await safeDelete("milestones", prisma.milestone);
    await safeDelete("KB articles", prisma.knowledgeBase);
    await safeDelete("projects", prisma.project);
    await safeDelete("SLA policies", prisma.slaPolicy);
    await safeDelete("client members", prisma.clientMember);
    await safeDelete("clients", prisma.client);
    await safeDelete("users", prisma.user);

    // Restore in order of dependencies
    console.log("\n📥 Restoring data...");

    // Helper to restore a table safely
    const safeRestore = async (name: string, items: any[], prismaModel: any, identifyField: string = 'name'): Promise<number> => {
      if (!items?.length) return 0;
      let restored = 0;
      try {
        console.log(`  • Restoring ${items.length} ${name}...`);
        for (const item of items) {
          try {
            await prismaModel.create({ data: item });
            restored++;
          } catch (e) {
            const identifier = item[identifyField] || item.id;
            console.warn(`    ⚠️  Skipped ${name}: ${identifier}`);
          }
        }
      } catch (err: any) {
        if (err.code === 'P2021') {
          console.log(`  ⏭️  Skipping ${name} (table doesn't exist)`);
          return 0;
        }
        throw err;
      }
      return restored;
    };

    await safeRestore("users", users, prisma.user, 'email');
    await safeRestore("clients", clients, prisma.client, 'name');
    await safeRestore("client members", clientMembers, prisma.clientMember, 'id');
    await safeRestore("projects", projects, prisma.project, 'name');
    await safeRestore("milestones", milestones, prisma.milestone, 'title');
    await safeRestore("SLA policies", slaPolicies, prisma.slaPolicy, 'id');
    await safeRestore("issues", issues, prisma.issue, 'ticketKey');
    await safeRestore("similar resolutions", similarResolutions, prisma.similarResolution, 'id');
    await safeRestore("issue attachments", issueAttachments, prisma.issueAttachment, 'fileName');
    await safeRestore("comments", comments, prisma.comment, 'id');
    await safeRestore("notifications", notifications, prisma.notification, 'id');
    await safeRestore("issue history", issueHistory, prisma.issueHistory, 'id');
    await safeRestore("KB articles", knowledgeBase, prisma.knowledgeBase, 'title');
    await safeRestore("KB feedback", knowledgeBaseFeedback, prisma.knowledgeBaseFeedback, 'id');
    await safeRestore("summaries", summaries, prisma.summary, 'id');

    console.log("\n✅ Restore completed successfully!");
    console.log(`📦 Restored from: ${backupFile}`);
    console.log(`📅 Backup was from: ${backupData.metadata?.backupAt}`);

  } catch (error) {
    console.error("❌ Restore failed:", error);
    process.exit(1);
  }
}

const backupFile = process.argv[2];
restoreDatabase(backupFile).then(() => {
  console.log("\n🎉 Done!");
  process.exit(0);
});

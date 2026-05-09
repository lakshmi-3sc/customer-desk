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

    const { users, clients, projects, issues, comments, knowledgeBase } = backupData.data;

    console.log("\n⚠️  WARNING: This will DELETE all existing data and restore from backup!");
    console.log("Restore plan:");
    console.log(`  • Clear all tables`);
    console.log(`  • Restore ${users?.length || 0} users`);
    console.log(`  • Restore ${clients?.length || 0} clients`);
    console.log(`  • Restore ${projects?.length || 0} projects`);
    console.log(`  • Restore ${issues?.length || 0} issues`);
    console.log(`  • Restore ${comments?.length || 0} comments`);
    console.log(`  • Restore ${knowledgeBase?.length || 0} KB articles`);
    console.log("\n⏸️  Proceeding in 5 seconds... Press Ctrl+C to cancel\n");

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Delete all existing data (in reverse order of dependencies)
    console.log("🧹 Clearing existing data...");
    await prisma.comment.deleteMany({});
    await prisma.issue.deleteMany({});
    await prisma.knowledgeBase.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.clientMember.deleteMany({});
    await prisma.client.deleteMany({});
    await prisma.user.deleteMany({});

    // Restore in order of dependencies
    console.log("\n📥 Restoring data...");

    if (users?.length) {
      console.log(`  • Restoring ${users.length} users...`);
      for (const user of users) {
        try {
          await prisma.user.create({ data: user });
        } catch (e) {
          console.warn(`    ⚠️  Skipped user (may already exist): ${user.email}`);
        }
      }
    }

    if (clients?.length) {
      console.log(`  • Restoring ${clients.length} clients...`);
      for (const client of clients) {
        try {
          await prisma.client.create({ data: client });
        } catch (e) {
          console.warn(`    ⚠️  Skipped client: ${client.name}`);
        }
      }
    }

    if (projects?.length) {
      console.log(`  • Restoring ${projects.length} projects...`);
      for (const project of projects) {
        try {
          await prisma.project.create({ data: project });
        } catch (e) {
          console.warn(`    ⚠️  Skipped project: ${project.name}`);
        }
      }
    }

    if (issues?.length) {
      console.log(`  • Restoring ${issues.length} issues...`);
      for (const issue of issues) {
        try {
          await prisma.issue.create({ data: issue });
        } catch (e) {
          console.warn(`    ⚠️  Skipped issue: ${issue.ticketKey || issue.id}`);
        }
      }
    }

    if (comments?.length) {
      console.log(`  • Restoring ${comments.length} comments...`);
      for (const comment of comments) {
        try {
          await prisma.comment.create({ data: comment });
        } catch (e) {
          console.warn(`    ⚠️  Skipped comment`);
        }
      }
    }

    if (knowledgeBase?.length) {
      console.log(`  • Restoring ${knowledgeBase.length} KB articles...`);
      for (const kb of knowledgeBase) {
        try {
          await prisma.knowledgeBase.create({ data: kb });
        } catch (e) {
          console.warn(`    ⚠️  Skipped KB article: ${kb.title}`);
        }
      }
    }

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

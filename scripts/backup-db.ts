import { prisma } from "@/lib/prisma";
import * as fs from "fs";

async function backupDatabase() {
  console.log("🔄 Backing up all database tables...\n");

  try {
    console.log("  📥 Fetching users...");
    const users = await prisma.user.findMany();

    console.log("  📥 Fetching clients...");
    const clients = await prisma.client.findMany();

    console.log("  📥 Fetching projects...");
    const projects = await prisma.project.findMany();

    console.log("  📥 Fetching issues...");
    const issues = await prisma.issue.findMany();

    console.log("  📥 Fetching comments...");
    const comments = await prisma.comment.findMany();

    console.log("  📥 Fetching knowledge base articles...");
    const knowledgeBase = await prisma.knowledgeBase.findMany();

    const backup = {
      metadata: {
        backupAt: new Date().toISOString(),
        backupVersion: "1.0",
        databaseUrl: process.env.DATABASE_URL ? "***hidden***" : "not-configured",
      },
      counts: {
        users: users.length,
        clients: clients.length,
        projects: projects.length,
        issues: issues.length,
        comments: comments.length,
        knowledgeBase: knowledgeBase.length,
      },
      data: {
        users,
        clients,
        projects,
        issues,
        comments,
        knowledgeBase,
      },
    };

    // Create backups folder
    fs.mkdirSync("backups", { recursive: true });

    // Save as JSON
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `backups/backup-${timestamp}.json`;

    fs.writeFileSync(filename, JSON.stringify(backup, null, 2));

    const sizeInMB = (fs.statSync(filename).size / 1024 / 1024).toFixed(2);

    console.log("\n✅ Backup completed successfully!\n");
    console.log(`📁 File: ${filename}`);
    console.log(`📊 Size: ${sizeInMB} MB`);
    console.log(`📦 Tables backed up:`);
    console.log(`   • Users: ${users.length}`);
    console.log(`   • Clients: ${clients.length}`);
    console.log(`   • Projects: ${projects.length}`);
    console.log(`   • Issues: ${issues.length}`);
    console.log(`   • Comments: ${comments.length}`);
    console.log(`   • Knowledge Base: ${knowledgeBase.length}`);
    console.log(`\n💾 IMPORTANT: Save this file to cloud storage (Google Drive, Dropbox, etc.)`);
  } catch (error) {
    console.error("❌ Backup failed:", error);
    process.exit(1);
  }
}

backupDatabase().then(() => {
  console.log("\n🎉 Done!");
  process.exit(0);
});

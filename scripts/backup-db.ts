import { prisma } from "@/lib/prisma";
import * as fs from "fs";

async function backupDatabase() {
  console.log("🔄 Backing up all database tables...\n");

  try {
    // Helper function to safely fetch data, skip if table doesn't exist
    const safeFind = async (name: string, prismaModel: any): Promise<any[]> => {
      try {
        console.log(`  📥 Fetching ${name}...`);
        return await prismaModel.findMany();
      } catch (err: any) {
        if (err.code === 'P2021') {
          console.log(`  ⏭️  Skipping ${name} (table doesn't exist yet)`);
          return [];
        }
        throw err;
      }
    };

    const users = await safeFind("users", prisma.user);
    const clients = await safeFind("clients", prisma.client);
    const clientMembers = await safeFind("client members", prisma.clientMember);
    const projects = await safeFind("projects", prisma.project);
    const milestones = await safeFind("milestones", prisma.milestone);
    const slaPolicies = await safeFind("SLA policies", prisma.slaPolicy);
    const issues = await safeFind("issues", prisma.issue);
    const similarResolutions = await safeFind("similar resolutions", prisma.similarResolution);
    const issueAttachments = await safeFind("issue attachments", prisma.issueAttachment);
    const comments = await safeFind("comments", prisma.comment);
    const notifications = await safeFind("notifications", prisma.notification);
    const issueHistory = await safeFind("issue history", prisma.issueHistory);
    const knowledgeBase = await safeFind("knowledge base articles", prisma.knowledgeBase);
    const knowledgeBaseFeedback = await safeFind("KB feedback", prisma.knowledgeBaseFeedback);
    const summaries = await safeFind("summaries", prisma.summary);

    const backup = {
      metadata: {
        backupAt: new Date().toISOString(),
        backupVersion: "2.0",
        databaseUrl: process.env.DATABASE_URL ? "***hidden***" : "not-configured",
      },
      counts: {
        users: users.length,
        clients: clients.length,
        clientMembers: clientMembers.length,
        projects: projects.length,
        milestones: milestones.length,
        slaPolicies: slaPolicies.length,
        issues: issues.length,
        similarResolutions: similarResolutions.length,
        issueAttachments: issueAttachments.length,
        comments: comments.length,
        notifications: notifications.length,
        issueHistory: issueHistory.length,
        knowledgeBase: knowledgeBase.length,
        knowledgeBaseFeedback: knowledgeBaseFeedback.length,
        summaries: summaries.length,
      },
      data: {
        users,
        clients,
        clientMembers,
        projects,
        milestones,
        slaPolicies,
        issues,
        similarResolutions,
        issueAttachments,
        comments,
        notifications,
        issueHistory,
        knowledgeBase,
        knowledgeBaseFeedback,
        summaries,
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
    console.log(`   • Client Members: ${clientMembers.length}`);
    console.log(`   • Projects: ${projects.length}`);
    console.log(`   • Milestones: ${milestones.length}`);
    console.log(`   • SLA Policies: ${slaPolicies.length}`);
    console.log(`   • Issues: ${issues.length}`);
    console.log(`   • Similar Resolutions: ${similarResolutions.length}`);
    console.log(`   • Issue Attachments: ${issueAttachments.length}`);
    console.log(`   • Comments: ${comments.length}`);
    console.log(`   • Notifications: ${notifications.length}`);
    console.log(`   • Issue History: ${issueHistory.length}`);
    console.log(`   • Knowledge Base: ${knowledgeBase.length}`);
    console.log(`   • KB Feedback: ${knowledgeBaseFeedback.length}`);
    console.log(`   • Summaries: ${summaries.length}`);
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

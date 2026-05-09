import { prisma } from "@/lib/prisma";

async function checkData() {
  try {
    const clients = await prisma.client.findMany({ select: { id: true, name: true } });
    const users = await prisma.user.findMany({ select: { id: true, email: true, name: true } });
    const issues = await prisma.issue.findMany({ select: { id: true, title: true } });
    const projects = await prisma.project.findMany({ select: { id: true, name: true } });
    const kbArticles = await prisma.knowledgeBase.findMany({ select: { id: true, title: true } });
    
    console.log("=== DATABASE STATUS ===");
    console.log("Clients:", clients.length);
    console.log("Users:", users.length);
    console.log("Issues:", issues.length);
    console.log("Projects:", projects.length);
    console.log("KB Articles:", kbArticles.length);
    
    if (clients.length > 0) console.log("\nClients:", clients.map(c => c.name).join(", "));
    if (users.length > 0) console.log("Users:", users.map(u => u.email).join(", "));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();

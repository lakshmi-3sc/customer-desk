import { prisma } from "@/lib/prisma";

/**
 * Cleanup script to remove tickets with incorrect TICKET-xxx format keys
 * These were created before we fixed generateTicketKey usage
 */
async function cleanupWrongTicketKeys() {
  try {
    console.log("🧹 Removing tickets with incorrect TICKET-xxx format...");

    const deleted = await prisma.issue.deleteMany({
      where: {
        ticketKey: {
          startsWith: "TICKET-",
        },
        status: "RESOLVED", // Only delete RESOLVED tickets (the ones we just created)
      },
    });

    console.log(`✅ Deleted ${deleted.count} tickets with incorrect format`);
  } catch (error) {
    console.error("❌ Error cleaning up:", error);
    throw error;
  }
}

cleanupWrongTicketKeys()
  .then(() => {
    console.log("✨ Cleanup complete!");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

import { prisma } from "@/lib/prisma";
import { generateTicketKey } from "@/lib/ticket-key";

/**
 * Fix script to update tickets with incorrect TICKET-xxx format keys
 * Generates proper keys using generateTicketKey() based on project
 * Handles potential unique constraint conflicts safely
 */
async function fixTicketKeys() {
  try {
    console.log("🔧 Fixing ticket keys with incorrect TICKET-xxx format...");

    // Find all tickets with wrong format
    const wrongTickets = await prisma.issue.findMany({
      where: {
        ticketKey: {
          startsWith: "TICKET-",
        },
      },
      orderBy: { createdAt: "asc" }, // Process in order they were created
    });

    console.log(`Found ${wrongTickets.length} tickets to fix\n`);

    if (wrongTickets.length === 0) {
      console.log("✨ No tickets to fix!");
      return;
    }

    let successCount = 0;
    let failCount = 0;

    // Update each ticket with correct key
    for (const ticket of wrongTickets) {
      try {
        let correctKey = await generateTicketKey(ticket.projectId);
        let attempts = 0;
        const maxAttempts = 5;

        // If key already exists, try generating a new one (up to 5 times)
        while (attempts < maxAttempts) {
          const existing = await prisma.issue.findFirst({
            where: { ticketKey: correctKey },
          });

          if (!existing) {
            // Key is unique, safe to use
            break;
          }

          console.log(`  ⚠️  Key ${correctKey} already exists, trying again...`);
          correctKey = await generateTicketKey(ticket.projectId);
          attempts++;
        }

        if (attempts >= maxAttempts) {
          console.log(`  ❌ ${ticket.ticketKey} - Could not generate unique key after ${maxAttempts} attempts`);
          failCount++;
          continue;
        }

        await prisma.issue.update({
          where: { id: ticket.id },
          data: { ticketKey: correctKey },
        });

        console.log(`  ✅ ${ticket.ticketKey} → ${correctKey}`);
        successCount++;
      } catch (error) {
        console.log(`  ❌ ${ticket.ticketKey} - Error: ${error instanceof Error ? error.message : error}`);
        failCount++;
      }
    }

    console.log(`\n✨ Fixed ${successCount}/${wrongTickets.length} tickets!`);
    if (failCount > 0) {
      console.log(`⚠️  Failed to fix ${failCount} tickets - please check manually`);
    }
  } catch (error) {
    console.error("❌ Error fixing tickets:", error);
    throw error;
  }
}

fixTicketKeys()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

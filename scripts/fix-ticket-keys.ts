import { prisma } from "@/lib/prisma";

async function fixTicketKeys() {
  try {
    // Disable triggers temporarily
    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS issue_search_vector_trigger ON "Issue"`);

    const ticketsToFix = [
      {
        id: "cmokbdiqk000f1mp927qbvq7m",
        title: "Raw material forecasting model updated",
      },
      {
        id: "cmokbdinz000d1mp99h999647",
        title: "Production planning bottleneck identified and fixed",
      },
      {
        id: "cmokbdild000b1mp9zjgcc43f",
        title: "Replenishment safety stock optimized",
      },
    ];

    console.log("Fixing ticket keys...\n");

    for (const ticket of ticketsToFix) {
      const issue = await prisma.issue.findUnique({
        where: { id: ticket.id },
        include: { client: true, project: true },
      });

      if (!issue) {
        console.log(`❌ Ticket ${ticket.id} not found`);
        continue;
      }

      // Generate proper ticket key: [CLIENT_CODE]-[NUMBER]
      // Get the highest ticket number for this client
      const existingTickets = await prisma.issue.findMany({
        where: {
          clientId: issue.clientId,
          ticketKey: { not: null },
        },
        select: { ticketKey: true },
      });

      let nextNumber = 1024; // Start from 1024
      if (existingTickets.length > 0) {
        const numbers = existingTickets
          .map((t) => {
            const match = t.ticketKey?.match(/COLGATE-(\d+)/);
            return match ? parseInt(match[1]) : 0;
          })
          .filter((n) => n > 0);

        nextNumber = Math.max(...numbers, 1023) + 1;
      }

      const newTicketKey = `COLGATE-${nextNumber}`;

      // Update the ticket using raw SQL to avoid Prisma issues
      await prisma.$executeRawUnsafe(
        `UPDATE "Issue" SET "ticketKey" = $1 WHERE "id" = $2`,
        newTicketKey,
        ticket.id
      );

      console.log(
        `✅ ${ticket.id}`
      );
      console.log(`   Title: ${issue.title}`);
      console.log(`   New Key: ${newTicketKey}`);
      console.log(`   Status: ${issue.status}`);
      console.log(`   Client: ${issue.client.name}\n`);
    }

    console.log("✅ All tickets fixed successfully!");

    // Recreate the trigger
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION issue_search_vector_trigger() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector := setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') || setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER issue_search_vector_trigger BEFORE INSERT OR UPDATE ON "Issue"
        FOR EACH ROW EXECUTE FUNCTION issue_search_vector_trigger()
    `);

    console.log("✅ Triggers recreated successfully!");
  } catch (error) {
    console.error("Error fixing tickets:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixTicketKeys();

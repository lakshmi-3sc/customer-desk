import { prisma } from "@/lib/prisma";

async function checkMigrations() {
  try {
    const result = await prisma.$queryRaw`
      SELECT id, checksum, finished_at
      FROM "_prisma_migrations"
      ORDER BY finished_at DESC;
    `;
    console.log("Migration History:");
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

checkMigrations();

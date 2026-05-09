import { prisma } from "@/lib/prisma";

async function checkDatabase() {
  try {
    console.log("=== DETAILED DATABASE STATE ===\n");
    
    // Check all tables for any data
    const tableInfo = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        (SELECT COUNT(*) FROM information_schema.tables t2 
         WHERE t2.table_schema = t.schemaname AND t2.table_name = t.tablename) as exists
      FROM pg_tables t
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;
    
    console.log("Tables in database:", tableInfo);
    
    // Check row counts
    const rowCounts = await prisma.$queryRaw`
      SELECT 
        'User' as table_name, COUNT(*) as count FROM "User"
      UNION ALL
      SELECT 'Client', COUNT(*) FROM "Client"
      UNION ALL
      SELECT 'Project', COUNT(*) FROM "Project"
      UNION ALL
      SELECT 'Issue', COUNT(*) FROM "Issue"
      UNION ALL
      SELECT 'KnowledgeBase', COUNT(*) FROM "KnowledgeBase"
      UNION ALL
      SELECT 'ClientMember', COUNT(*) FROM "ClientMember";
    `;
    
    console.log("\nRow counts:");
    console.log(rowCounts);
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();

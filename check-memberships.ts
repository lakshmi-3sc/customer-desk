import { prisma } from "./lib/prisma";

async function check() {
  const clientUsers = await prisma.user.findMany({
    where: { role: { in: ["CLIENT_ADMIN", "CLIENT_USER"] } },
    include: { clientMembers: true },
  });

  console.log("Client Users and their memberships:");
  clientUsers.forEach(u => {
    console.log(`${u.email} (${u.role}): ${u.clientMembers.length} membership(s)`);
  });

  const membershipsCount = await prisma.clientMember.count();
  console.log(`\nTotal ClientMembers: ${membershipsCount}`);
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_TICKETS = [
  {
    title: 'Unable to reset password',
    description: 'I am unable to reset my password. Getting error "Invalid reset token" when I try to use the reset link sent to my email.',
    category: 'ACCESS_SECURITY' as const,
    priority: 'HIGH' as const,
    status: 'RESOLVED' as const,
  },
  {
    title: 'Password reset failing for specific email domain',
    description: 'Password reset functionality fails when users try to reset with corporate email addresses ending with @company.com. Personal emails work fine.',
    category: 'ACCESS_SECURITY' as const,
    priority: 'CRITICAL' as const,
    status: 'RESOLVED' as const,
  },
  {
    title: 'Login page crashes on mobile devices',
    description: 'When users try to login on mobile Safari, the page crashes immediately after entering credentials. Works fine on Chrome and desktop.',
    category: 'BUG' as const,
    priority: 'CRITICAL' as const,
    status: 'IN_PROGRESS' as const,
  },
  {
    title: 'Dashboard loading slowly during peak hours',
    description: 'The main dashboard takes 8-10 seconds to load between 9AM-12PM. Normal load time is 2 seconds. This is affecting user experience.',
    category: 'PERFORMANCE' as const,
    priority: 'HIGH' as const,
    status: 'ACKNOWLEDGED' as const,
  },
  {
    title: 'Data export to CSV is missing columns',
    description: 'When exporting reports to CSV, some columns like "Last Updated" and "Status" are missing from the output. Need all fields to be exported.',
    category: 'DATA_ACCURACY' as const,
    priority: 'MEDIUM' as const,
    status: 'OPEN' as const,
  },
  {
    title: 'Request: Add bulk user import feature',
    description: 'Currently we can only add users one by one. Would be great if we could upload a CSV file to bulk import multiple users at once.',
    category: 'FEATURE_REQUEST' as const,
    priority: 'MEDIUM' as const,
    status: 'OPEN' as const,
  },
  {
    title: 'Request: Dark mode support',
    description: 'Many of our users work late shifts and request dark mode for the application. This would reduce eye strain during night operations.',
    category: 'FEATURE_REQUEST' as const,
    priority: 'LOW' as const,
    status: 'OPEN' as const,
  },
  {
    title: 'Reports showing duplicate entries',
    description: 'The monthly reports are showing duplicate transaction entries, making the totals incorrect. Data accuracy is critical for our audits.',
    category: 'DATA_ACCURACY' as const,
    priority: 'CRITICAL' as const,
    status: 'IN_PROGRESS' as const,
  },
  {
    title: 'API response time exceeds SLA',
    description: 'The /api/users endpoint is taking 5-8 seconds to respond. Should be under 500ms per SLA agreement. This is happening for requests with large datasets.',
    category: 'PERFORMANCE' as const,
    priority: 'HIGH' as const,
    status: 'OPEN' as const,
  },
  {
    title: 'Cannot export data due to memory error',
    description: 'Getting "Out of Memory" error when trying to export large datasets (over 50K records). Need ability to export in chunks or with pagination.',
    category: 'BUG' as const,
    priority: 'HIGH' as const,
    status: 'RESOLVED' as const,
  },
  {
    title: 'Two-factor authentication not working',
    description: 'Users cannot enable 2FA. When they scan the QR code and enter the token, they get "Invalid token" error even with correct codes.',
    category: 'ACCESS_SECURITY' as const,
    priority: 'CRITICAL' as const,
    status: 'CLOSED' as const,
  },
  {
    title: 'Request: API documentation needs improvement',
    description: 'Current API docs are missing examples for pagination and filtering. Would be helpful to have curl examples for each endpoint.',
    category: 'FEATURE_REQUEST' as const,
    priority: 'LOW' as const,
    status: 'ACKNOWLEDGED' as const,
  },
];

async function main() {
  try {
    // Get the first client and a random user for demo purposes
    const client = await prisma.client.findFirst();
    const user = await prisma.user.findFirst({
      where: { role: 'CLIENT_USER' }
    });

    if (!client) {
      console.log('❌ No clients found. Please create a client first.');
      process.exit(1);
    }

    if (!user) {
      console.log('❌ No CLIENT_USER found. Please create a user first.');
      process.exit(1);
    }

    console.log(`📝 Creating sample tickets for client: ${client.name}`);
    console.log(`👤 Raised by user: ${user.name}\n`);

    let createdCount = 0;

    for (const ticket of DEMO_TICKETS) {
      const existing = await prisma.issue.findFirst({
        where: { title: ticket.title }
      });

      if (existing) {
        console.log(`⏭️  Skipped: "${ticket.title}" (already exists)`);
        continue;
      }

      const issue = await prisma.issue.create({
        data: {
          ...ticket,
          clientId: client.id,
          raisedById: user.id,
          ticketKey: `DEMO-${1000 + createdCount + 1}`,
        },
      });

      console.log(`✅ Created: "${issue.title}" (${issue.category})`);
      createdCount++;
    }

    console.log(`\n✨ Successfully created ${createdCount} sample tickets!`);
    console.log('\nYou can now create a similar ticket and the system will show these as references.');

  } catch (error) {
    console.error('❌ Error seeding demo tickets:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

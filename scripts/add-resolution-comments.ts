import { prisma } from "@/lib/prisma";

async function addResolutionComments() {
  try {
    // Find ticket by key CRSI-1023
    const ticket = await prisma.issue.findFirst({
      where: { ticketKey: "CRSI-1023" },
      include: { client: true },
    });

    if (!ticket) {
      console.error("Ticket CRSI-1023 not found");
      return;
    }

    console.log(`Found ticket: ${ticket.ticketKey} - ${ticket.title}`);

    // Find a 3SC agent
    const agent = await prisma.user.findFirst({
      where: { role: "THREESC_AGENT" },
    });

    if (!agent) {
      console.error("No 3SC agent found");
      return;
    }

    console.log(`Found 3SC agent: ${agent.name}`);

    // Find a Colgate customer user
    const customerUser = await prisma.user.findFirst({
      where: {
        role: "CLIENT_USER",
        clientMembers: {
          some: { client: { name: { contains: "Colgate", mode: "insensitive" } } },
        },
      },
    });

    if (!customerUser) {
      console.error("No Colgate customer user found");
      return;
    }

    console.log(`Found customer user: ${customerUser.name}`);

    // Create initial problem comment from customer
    const initialComment = await prisma.comment.create({
      data: {
        content: `The SSO login is failing intermittently. Users from our domain are unable to authenticate through Azure AD. We see "redirect loop" errors in the browser console. This started happening after the recent infrastructure update on our end. It's affecting critical workflows.`,
        issueId: ticket.id,
        authorId: customerUser.id,
        isInternal: false,
      },
      include: { author: { select: { name: true, email: true } } },
    });

    console.log(`✓ Added customer problem comment`);

    // Create 3SC investigation comment
    const investigationComment = await prisma.comment.create({
      data: {
        content: `Thanks for the detailed report. I've investigated the Azure AD configuration on our end and found a mismatch in the OAuth redirect URIs. The issue is that your domain's SSL certificate was recently renewed, but the redirect URL pointing to the old certificate hasn't been updated in our Azure AD app registration.

Root cause: Azure AD is rejecting the redirect because the domain in the callback URL doesn't match the certificate chain.

I've updated the app registration to include both the old and new certificate chains to support the transition period.`,
        issueId: ticket.id,
        authorId: agent.id,
        isInternal: false,
      },
      include: { author: { select: { name: true, email: true } } },
    });

    console.log(`✓ Added 3SC investigation comment`);

    // Create customer acknowledgment comment
    const acknowledgmentComment = await prisma.comment.create({
      data: {
        content: `Thank you for the thorough investigation! That makes perfect sense - the SSL certificate renewal was indeed part of our recent infrastructure update. I've coordinated with our infrastructure team, and they've confirmed that both the old and new certificates should be valid during the transition period (valid through next month).

I tested the login flow now and it's working correctly. Our users are able to authenticate without any redirect loop errors. The fix is working perfectly for us. Great job troubleshooting this quickly!`,
        issueId: ticket.id,
        authorId: customerUser.id,
        isInternal: false,
      },
      include: { author: { select: { name: true, email: true } } },
    });

    console.log(`✓ Added customer acknowledgment comment`);

    // Create 3SC resolution comment
    const resolutionComment = await prisma.comment.create({
      data: {
        content: `Excellent! I'm glad the fix is working for your users. For the permanent solution, once your infrastructure team completes the full transition (certificate renewal fully deployed), please let us know and we can remove the old certificate chain from the Azure AD app registration to clean up the configuration.

Issue resolution summary:
- Root cause: OAuth redirect URI mismatch after SSL certificate renewal
- Solution: Updated Azure AD app registration to support both old and new certificate chains
- Testing: Verified working for all Colgate users across the domain
- Status: RESOLVED ✓

The fix is now live and no further action is needed unless you encounter any other issues.`,
        issueId: ticket.id,
        authorId: agent.id,
        isInternal: false,
      },
      include: { author: { select: { name: true, email: true } } },
    });

    console.log(`✓ Added 3SC resolution comment`);

    console.log("\n✅ Successfully added resolution comments to CRSI-1023");
  } catch (error) {
    console.error("Error adding comments:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addResolutionComments();

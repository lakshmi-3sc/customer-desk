import { NextRequest, NextResponse } from "next/server";

// Static Knowledge Base articles
export const KB_ARTICLES = [
  {
    slug: "billing-invoice-guide",
    title: "Understanding Your Invoice",
    category: "Billing",
    summary: "A complete guide to reading and understanding your monthly invoice, charges, and billing cycles.",
    content: `## Understanding Your Invoice

Your monthly invoice from 3SC Connect breaks down all charges for the billing period.

### Invoice Sections

**Service Charges**
Your base service fee is charged at the start of each billing cycle. Any add-on modules or premium support tiers are listed as separate line items.

**Usage-Based Charges**
Overage fees may apply if you exceed your plan's included support tickets or API call limits. These are calculated daily and summarised on the monthly invoice.

**Tax & VAT**
VAT is applied at the standard rate applicable to your region. If you have a valid VAT number registered on your account, please ensure it is up-to-date in Settings → Billing.

### Common Questions

**Why was I charged more than usual this month?**
Check the "Usage" section of your invoice. If you submitted more tickets than your plan includes, an overage charge will appear.

**How do I update my billing information?**
Go to Settings → Billing → Payment Method. Changes take effect on the next billing cycle.

**Can I get a PDF copy?**
All invoices are available as PDF downloads from Settings → Billing → Invoice History.`,
    tags: ["invoice", "billing", "charges", "payment"],
  },
  {
    slug: "payment-methods",
    title: "Accepted Payment Methods",
    category: "Billing",
    summary: "Information on supported payment methods including credit cards, bank transfers, and direct debit.",
    content: `## Accepted Payment Methods

3SC Connect accepts the following payment methods:

### Credit & Debit Cards
- Visa, Mastercard, American Express
- Cards are charged automatically on your billing date
- You'll receive an email receipt within 24 hours

### Bank Transfer (BACS/SEPA)
- Available for annual plans only
- Requires 5 business days for clearance
- Reference your account number on all transfers

### Direct Debit
- Set up via Settings → Billing → Payment Method
- Requires a mandate authorisation — we'll send you a link

### Failed Payments
If a payment fails, we'll retry after 3 days and notify you by email. After 3 failed attempts, your account will be paused.`,
    tags: ["payment", "credit card", "bank transfer", "billing"],
  },
  {
    slug: "api-quickstart",
    title: "API Integration Quickstart",
    category: "Integration",
    summary: "Step-by-step guide to connecting your systems to the 3SC Connect API.",
    content: `## API Integration Quickstart

Get up and running with the 3SC Connect REST API in under 30 minutes.

### Authentication
All API requests require a Bearer token. Generate your API key from Settings → Integrations → API Keys.

\`\`\`bash
curl -H "Authorization: Bearer YOUR_API_KEY" \\
  https://api.3scconnect.com/v1/issues
\`\`\`

### Creating an Issue via API
\`\`\`json
POST /v1/issues
{
  "title": "Payment gateway timeout",
  "description": "Intermittent 504 errors during checkout",
  "priority": "HIGH",
  "category": "Technical"
}
\`\`\`

### Webhooks
Subscribe to real-time events by registering a webhook URL in Settings → Integrations → Webhooks.

Supported events:
- \`issue.created\`
- \`issue.status_changed\`
- \`comment.added\`
- \`sla.breached\`

### Rate Limits
- 100 requests per minute per API key
- 429 responses include a \`Retry-After\` header`,
    tags: ["api", "integration", "webhook", "authentication"],
  },
  {
    slug: "webhook-setup",
    title: "Setting Up Webhooks",
    category: "Integration",
    summary: "How to configure webhooks to receive real-time notifications when issues are updated.",
    content: `## Setting Up Webhooks

Webhooks allow your systems to be notified instantly when events occur in 3SC Connect.

### Registration
1. Navigate to Settings → Integrations → Webhooks
2. Click "Add Webhook Endpoint"
3. Enter your HTTPS URL (must be publicly reachable)
4. Select the events you want to subscribe to
5. Save — we'll immediately send a test payload

### Payload Format
\`\`\`json
{
  "event": "issue.status_changed",
  "timestamp": "2026-04-19T10:30:00Z",
  "data": {
    "issueId": "abc123",
    "ticketKey": "PROJ-1042",
    "oldStatus": "OPEN",
    "newStatus": "IN_PROGRESS"
  }
}
\`\`\`

### Verifying Payloads
Each request includes an \`X-3SC-Signature\` header. Verify it using your webhook secret to ensure authenticity.

### Retries
Failed webhook deliveries are retried with exponential backoff: 5m, 30m, 2h, 8h, 24h.`,
    tags: ["webhook", "integration", "events", "notifications"],
  },
  {
    slug: "delivery-tracking",
    title: "Tracking Your Delivery Status",
    category: "Delivery",
    summary: "How to track the real-time status of your service deliveries and project milestones.",
    content: `## Tracking Your Delivery Status

Use the 3SC Connect portal to stay informed about your service deliveries.

### Delivery Statuses

| Status | Meaning |
|--------|---------|
| Scheduled | Delivery is planned and confirmed |
| In Transit | Delivery is actively in progress |
| Delivered | Successfully completed |
| On Hold | Paused — usually awaiting your input |
| Cancelled | Delivery has been cancelled |

### Tracking from Your Dashboard
Your Client Dashboard shows a live summary of all active deliveries. Click any delivery to see the full timeline.

### Email Notifications
Enable email alerts for delivery status changes in Settings → Notifications.

### Raising a Delivery Issue
If a delivery is delayed or incorrect, raise an issue with Category set to "Delivery". Include your reference number in the description.`,
    tags: ["delivery", "tracking", "status", "milestones"],
  },
  {
    slug: "delivery-sla",
    title: "Delivery SLA & Escalation",
    category: "Delivery",
    summary: "Understanding your service level agreements for delivery timelines and how to escalate.",
    content: `## Delivery SLA & Escalation

Your contract includes specific SLA targets for delivery timelines.

### Standard SLA Targets
- **Critical issues**: First response within 1 hour, resolution within 4 hours
- **High priority**: First response within 4 hours, resolution within 1 business day
- **Medium priority**: First response within 8 hours, resolution within 3 business days
- **Low priority**: First response within 1 business day, resolution within 5 business days

### Monitoring SLA
Issues approaching their SLA deadline appear with an amber warning badge. Breached SLAs show a red badge.

### Escalation Process
1. If an issue is not progressing, use the "Escalate" option in Issue Detail
2. This notifies your account manager and a senior support lead
3. You'll receive a response within 2 hours of escalation`,
    tags: ["sla", "escalation", "delivery", "response time"],
  },
  {
    slug: "account-setup",
    title: "Setting Up Your Account",
    category: "Account",
    summary: "Complete guide to getting your 3SC Connect account configured and ready to use.",
    content: `## Setting Up Your Account

Follow these steps to get your team up and running quickly.

### Step 1: Complete Your Profile
Go to Settings → Workspace and fill in your company details, logo, and contact information.

### Step 2: Invite Team Members
Navigate to Team → Invite Member. Enter the email address and assign a role:
- **Client Admin**: Full access, can invite other members
- **Client User**: Can raise and track their own issues

### Step 3: Connect Your Projects
Projects help organise your issues. Your account manager will have set up initial projects. You can view them at Settings → Projects.

### Step 4: Configure Notifications
Go to Settings → Notifications to choose which events trigger email alerts.

### Step 5: Explore Integrations
Connect Slack, Microsoft Teams, or your ticketing system via Settings → Integrations.`,
    tags: ["setup", "account", "team", "onboarding"],
  },
  {
    slug: "user-roles",
    title: "User Roles & Permissions",
    category: "Account",
    summary: "A breakdown of the different user roles and what each one can access.",
    content: `## User Roles & Permissions

3SC Connect has two client-facing roles:

### Client Admin
- View all issues raised by any team member
- Invite and manage team members
- Access Reports, Team Management, and Settings
- Export data as CSV

### Client User
- View and manage their own issues only
- Raise new issues
- Communicate with 3SC agents via the conversation thread
- Access the Knowledge Base

### Changing Roles
Only Client Admins can change role assignments. Go to Team → click the member → Edit Role.

### Removing a User
Removing a user deactivates their login but preserves all historical data. Go to Team → click the member → Deactivate.`,
    tags: ["roles", "permissions", "admin", "user management"],
  },
  {
    slug: "technical-troubleshooting",
    title: "Common Technical Issues & Fixes",
    category: "Technical",
    summary: "Quick fixes for the most common technical problems reported by customers.",
    content: `## Common Technical Issues & Fixes

### Login Problems
**Can't log in?**
1. Ensure you're using the email registered on your account
2. Use "Forgot Password" to reset credentials
3. Clear browser cookies and try again
4. Check if your company SSO is configured — use that login if so

### Portal Loading Slowly
- Clear your browser cache (Ctrl+Shift+Delete)
- Try a different browser
- Disable browser extensions temporarily

### File Upload Failing
- Maximum file size is 10 MB per attachment
- Supported formats: PDF, PNG, JPG, DOCX, XLSX, CSV, ZIP
- If upload still fails, try a different network (some corporate firewalls block uploads)

### Emails Not Arriving
- Check your spam/junk folder
- Ask your IT team to whitelist \`notifications@3scconnect.com\`
- Verify your email address in Settings → Profile

### API Errors
For API integration issues, check the [API Quickstart](/knowledge-base/api-quickstart) guide. Common error codes:
- **401**: Invalid or expired API key
- **429**: Rate limit exceeded — wait 60 seconds
- **503**: Temporary outage — check status.3scconnect.com`,
    tags: ["troubleshooting", "technical", "login", "errors"],
  },
  {
    slug: "raising-issues-best-practices",
    title: "Best Practices for Raising Issues",
    category: "Technical",
    summary: "How to write clear, actionable issue reports that get resolved faster.",
    content: `## Best Practices for Raising Issues

Well-written issue reports get resolved faster. Here's how to write them.

### Write a Clear Title
Bad: "It's not working"
Good: "Payment gateway returns 504 timeout during checkout on mobile"

### Choose the Right Priority
- **Critical**: System down, data loss, complete blocker
- **High**: Major feature broken, significant business impact
- **Medium**: Partial functionality affected
- **Low**: Minor inconvenience, cosmetic issues

### Describe the Problem Fully
Include:
- Steps to reproduce
- Expected behaviour
- Actual behaviour
- Error messages (paste exact text)
- Screenshots or screen recordings

### Attach Evidence
A screenshot or log file attached to the issue saves multiple round-trips and dramatically speeds up resolution.

### Use the Right Category
- **Billing**: Invoice or payment queries
- **Technical**: Software bugs, API issues
- **Delivery**: Project or delivery timeline queries
- **Integration**: API or third-party connection issues
- **Other**: Anything that doesn't fit above`,
    tags: ["best practices", "issues", "reporting", "technical"],
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.toLowerCase() ?? "";
  const category = searchParams.get("category") ?? "";
  const slug = searchParams.get("slug") ?? "";

  if (slug) {
    const article = KB_ARTICLES.find((a) => a.slug === slug);
    if (!article) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ article });
  }

  let articles = KB_ARTICLES;

  if (category) {
    articles = articles.filter((a) => a.category.toLowerCase() === category.toLowerCase());
  }

  if (q) {
    articles = articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.tags.some((t) => t.includes(q)) ||
        a.content.toLowerCase().includes(q)
    );
  }

  // Strip content from list view — summary is enough
  const list = articles.map(({ content: _, ...a }) => a);

  return NextResponse.json({ articles: list });
}

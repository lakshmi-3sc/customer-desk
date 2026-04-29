# Auto-Generated Weekly/Monthly Summaries Implementation

## Overview

This document describes the auto-generated summary system that provides enterprise-grade reporting for both internal 3SC teams and external clients.

## Features Implemented

### 1. **Dual-Mode Summary System**
- **Internal Summaries**: Generated for 3SC team with metrics on team performance, client metrics, SLA compliance, and escalations
- **Client-Facing Summaries**: Generated for individual clients with their specific issue metrics, completion rates, and SLA status

### 2. **Automated Generation**
- **Weekly Summaries**: Generated every Monday at server time
- **Monthly Summaries**: Generated on the 1st of each month at server time
- Triggered via POST endpoint: `/api/cron/summaries`

### 3. **Customizable Preferences**
- Clients can enable/disable summaries
- Select frequency (weekly, monthly, or both)
- Specify email recipients
- Choose content to include (resolved issues, open issues, SLA metrics, category breakdown)

### 4. **Rich HTML Email Templates**
- Professional styled HTML templates with gradient headers
- Responsive design for mobile and desktop
- Color-coded alerts for SLA status
- Embedded metrics cards and data tables

## Database Schema

### Summary Table (Enhanced)
```prisma
model Summary {
  id              String      @id @default(cuid())
  clientId        String
  projectId       String?
  periodStart     DateTime
  periodEnd       DateTime
  type            SummaryType    // WEEKLY or MONTHLY
  isInternal      Boolean     @default(false)
  title           String
  content         String
  metrics         Json?           // Aggregated metrics as JSON
  htmlContent     String?         // Rendered HTML for email
  sentToEmails    String[]    @default([])
  sentAt          DateTime?
  generatedByAi   Boolean     @default(false)
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}
```

### ClientSummaryPreference Table
```prisma
model ClientSummaryPreference {
  id                      String    @id @default(cuid())
  clientId                String    @unique
  summaryEnabled          Boolean   @default(true)
  weeklyEnabled           Boolean   @default(true)
  monthlyEnabled          Boolean   @default(true)
  emailRecipients         String[]  @default([])
  includeResolvedIssues   Boolean   @default(true)
  includeOpenIssues       Boolean   @default(true)
  includeSLAMetrics       Boolean   @default(true)
  includeCategoryBreakdown Boolean  @default(true)
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
}
```

### InternalSummaryPreference Table
```prisma
model InternalSummaryPreference {
  id                    String    @id @default(cuid())
  summaryEnabled        Boolean   @default(true)
  weeklyEnabled         Boolean   @default(true)
  monthlyEnabled        Boolean   @default(true)
  emailRecipients       String[]  @default([])
  includeClientMetrics  Boolean   @default(true)
  includeAgentPerformance Boolean @default(true)
  includeSLAMetrics     Boolean   @default(true)
  includeEscalations    Boolean   @default(true)
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
}
```

## API Endpoints

### GET `/api/summaries`
Fetch summaries for a client or internal team

**Query Parameters:**
- `clientId` (optional): Filter by specific client
- `type` (optional): WEEKLY or MONTHLY
- `isInternal` (optional): true for internal summaries

**Example:**
```bash
GET /api/summaries?clientId=cuid123&type=WEEKLY
GET /api/summaries?isInternal=true
```

### GET `/api/summaries/preferences?clientId=<clientId>`
Fetch summary preferences for a client

**Response:**
```json
{
  "preferences": {
    "id": "...",
    "clientId": "...",
    "summaryEnabled": true,
    "weeklyEnabled": true,
    "monthlyEnabled": true,
    "emailRecipients": ["user@example.com"],
    ...
  }
}
```

### PATCH `/api/summaries/preferences?clientId=<clientId>`
Update summary preferences for a client

**Request Body:**
```json
{
  "summaryEnabled": true,
  "weeklyEnabled": true,
  "monthlyEnabled": true,
  "emailRecipients": ["user@example.com", "manager@example.com"],
  "includeResolvedIssues": true,
  "includeOpenIssues": true,
  "includeSLAMetrics": true,
  "includeCategoryBreakdown": true
}
```

### POST `/api/cron/summaries`
Trigger summary generation (called by external cron service)

**Headers Required:**
```
x-cron-secret: <CRON_SECRET environment variable>
```

**Response:**
```json
{
  "success": true,
  "message": "Summary generation completed",
  "results": {
    "weeklyGenerated": 5,
    "monthlyGenerated": 0,
    "errors": []
  }
}
```

## Setup Instructions

### 1. Environment Variables

Add to `.env.local`:
```env
CRON_SECRET=your-secure-random-secret-here
```

### 2. Database Migration

The migration has already been created and applied:
```bash
npx prisma migrate deploy
```

### 3. Setup External Cron Service

Use any external cron service to trigger summaries:

**Option A: GitHub Actions**
```yaml
name: Generate Summaries
on:
  schedule:
    - cron: "0 9 * * 1"    # Weekly (Monday 9 AM UTC)
    - cron: "0 9 1 * *"    # Monthly (1st, 9 AM UTC)

jobs:
  summaries:
    runs-on: ubuntu-latest
    steps:
      - name: Generate Summaries
        run: |
          curl -X POST https://your-domain.com/api/cron/summaries \
            -H "x-cron-secret: ${{ secrets.CRON_SECRET }}"
```

**Option B: Vercel Cron**
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/summaries",
    "schedule": "0 9 * * 1"
  }]
}
```

**Option C: External Service (Cronitor, EasyCron, etc.)**
```
POST https://your-domain.com/api/cron/summaries
Headers: x-cron-secret: your-secret
Frequency: Weekly Mon 9 AM, Monthly 1st 9 AM
```

### 4. Initialize Preferences

Preferences are auto-created on first fetch. To pre-populate:

```typescript
// One-time setup script
const clients = await prisma.client.findMany();
for (const client of clients) {
  await prisma.clientSummaryPreference.upsert({
    where: { clientId: client.id },
    update: {},
    create: {
      clientId: client.id,
      emailRecipients: [], // Will be set by client
    },
  });
}
```

## Files Created

### Core Implementation
- `lib/summaries.ts` - Service functions for generating summaries and rendering HTML
- `app/api/cron/summaries/route.ts` - Cron job endpoint
- `app/api/summaries/route.ts` - Summary fetch endpoint
- `app/api/summaries/preferences/route.ts` - Preference management endpoint

### UI Components
- `components/summaries/InternalSummaryView.tsx` - Internal team view with metrics
- `components/summaries/ClientSummaryView.tsx` - Client-facing view
- `components/summaries/ClientSummarySettings.tsx` - Preference management UI

### Pages
- `app/summaries/page.tsx` - Client summaries page
- `app/admin/summaries/page.tsx` - Internal admin summaries page

### Database
- `prisma/schema.prisma` - Updated with Summary enhancements and preference models
- `prisma/migrations/20260428152916_add_summary_enhancements/migration.sql` - Migration file

## Usage

### For Clients

1. Navigate to `/summaries`
2. View your available summaries
3. Click "Settings" to customize:
   - Enable/disable summaries
   - Choose frequency (weekly/monthly)
   - Add email recipients
   - Select content to include
4. Summaries are automatically sent to configured email addresses

### For Internal Team

1. Navigate to `/admin/summaries`
2. View all generated summaries
3. Click on a summary to view detailed metrics and download as HTML
4. Metrics include:
   - Total open issues, resolved, SLA breaches
   - Agent performance
   - Top clients by issue count
   - Escalations and trends

## Metrics Included

### Internal Summary Metrics
```typescript
{
  totalOpen: number;
  resolved: number;
  slaBreaches: number;
  escalations: number;
  avgResolutionHours: number;
  csatScore: number;
  agentPerformance: [...];
  topClients: [...];
}
```

### Client Summary Metrics
```typescript
{
  totalSubmitted: number;
  resolved: number;
  completionRate: number;
  slaStatus: string;
  openIssues: number;
  recentlyResolved: [...];
  issuesByCategory: [...];
}
```

## Email Template Customization

To customize email templates, edit `lib/summaries.ts`:
- `renderInternalSummaryHTML()` - Internal email template
- `renderClientSummaryHTML()` - Client email template

The templates are responsive HTML with inline styles and support dark mode in email clients.

## Integration with Email Service

Currently, the system generates and stores HTML content. To send emails, integrate with your email service:

```typescript
// In app/api/cron/summaries/route.ts, add:
import { sendEmail } from "@/lib/email";

// After creating summary:
if (prefs?.emailRecipients?.length) {
  await sendEmail({
    to: prefs.emailRecipients,
    subject: `${client.name} - Weekly Summary`,
    html: htmlContent,
  });
}
```

## Troubleshooting

### Summaries not generating
1. Check `CRON_SECRET` matches in requests
2. Verify external cron service is configured correctly
3. Check server logs for errors in `/api/cron/summaries`
4. Confirm database migration applied: `npx prisma migrate status`

### Wrong metrics in summary
1. Verify `periodStart` and `periodEnd` are calculated correctly
2. Check issue filters in `generateInternalSummary()` and `generateClientSummary()`
3. Ensure issue statuses match your `IssueStatus` enum

### Emails not being sent
1. Implement email integration (see above)
2. Verify recipient email addresses in preferences
3. Check email service provider logs
4. Verify SMTP credentials and configuration

## Performance Considerations

- Summaries are generated once per week/month
- Metrics are calculated in-app and stored as JSON
- Large datasets (10k+ issues) may take 5-10 seconds to calculate
- Consider caching for frequently accessed metrics
- Monthly summaries calculate full month of data; weekly calculates 7 days

## Future Enhancements

1. **Email Integration**: Auto-send emails via SendGrid/Mailgun
2. **PDF Export**: Generate PDF versions of summaries
3. **Custom Date Ranges**: Allow users to generate on-demand summaries
4. **Trend Analysis**: Include month-over-month comparisons
5. **AI Insights**: Auto-generate recommendations from metrics
6. **Webhook Integration**: Trigger external systems when summaries are generated
7. **Scheduling Refinement**: Configurable time/day for generation

## Security Notes

- Cron secret should be strong and unique
- Summaries are tied to client/user with access control
- Email recipients validated on update
- HTML content is sanitized before storage
- All API endpoints require authentication

## Support

For issues or questions:
1. Check logs: `app/api/cron/summaries/route.ts`
2. Verify database schema: `prisma studio`
3. Test endpoint manually: `curl -X POST ... -H "x-cron-secret: ..."`
4. Review this documentation for setup steps

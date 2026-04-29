# Quick Start: Testing Auto-Generated Summaries

## Overview
This guide walks you through testing the auto-generated summaries feature locally without waiting for the actual weekly/monthly cron jobs.

## Prerequisites
- Node.js and npm installed
- Database with migration applied: `npx prisma migrate deploy`
- `.env.local` configured with `CRON_SECRET=test-secret`

## Step 1: Set Up Sample Data

### Create Test Client and Issues
```bash
# Run this in your database client (or through Prisma Studio)
npx prisma studio
```

**Or via API:**
```bash
# Create issues for testing (assuming you have a client already)
POST /api/dashboard/tickets
Body: {
  "title": "Sample Issue 1",
  "description": "Testing issue",
  "category": "BUG",
  "priority": "HIGH"
}
```

## Step 2: Test Summary Generation Locally

### Option A: Direct Function Call

Create a test script `test-summaries.ts`:

```typescript
import { 
  generateInternalSummary, 
  generateClientSummary,
  renderInternalSummaryHTML,
  renderClientSummaryHTML 
} from "@/lib/summaries";
import { prisma } from "@/lib/prisma";

async function testSummaries() {
  const now = new Date();
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  // Test internal summary
  console.log("Generating internal summary...");
  const internalMetrics = await generateInternalSummary(
    startOfWeek, 
    now, 
    "WEEKLY"
  );
  console.log("Internal metrics:", internalMetrics);
  
  const internalHTML = renderInternalSummaryHTML(
    internalMetrics, 
    "WEEKLY", 
    startOfWeek, 
    now
  );
  console.log("HTML length:", internalHTML.length);
  
  // Test client summary
  const clients = await prisma.client.findMany({ take: 1 });
  if (clients.length > 0) {
    console.log("\nGenerating client summary for:", clients[0].name);
    const clientMetrics = await generateClientSummary(
      clients[0].id, 
      startOfWeek, 
      now, 
      "WEEKLY"
    );
    console.log("Client metrics:", clientMetrics);
    
    const clientHTML = renderClientSummaryHTML(
      clients[0].name,
      clientMetrics, 
      "WEEKLY", 
      startOfWeek, 
      now
    );
    console.log("HTML length:", clientHTML.length);
  }
}

testSummaries().catch(console.error);
```

Run:
```bash
npx ts-node test-summaries.ts
```

### Option B: Call Cron Endpoint with curl

```bash
curl -X POST http://localhost:3000/api/cron/summaries \
  -H "x-cron-secret: test-secret" \
  -H "Content-Type: application/json"
```

## Step 3: Verify Database Records

### View Generated Summaries
```bash
npx prisma studio
```

Navigate to `Summary` table and verify:
- ✅ Records created with `type: WEEKLY` or `MONTHLY`
- ✅ `periodStart` and `periodEnd` set correctly
- ✅ `metrics` JSON populated with data
- ✅ `htmlContent` contains HTML email template
- ✅ `title` set to client name + period

## Step 4: View in Web UI

### For Clients
1. Login as CLIENT_USER
2. Navigate to **Summaries** in sidebar
3. View list of generated summaries
4. Click on a summary to view details
5. Download as HTML

### For Internal Team
1. Login as THREESC_ADMIN or THREESC_LEAD
2. Navigate to **Admin** → **Summary Reports**
3. View all internal summaries
4. Click on a summary to see metrics and download

## Step 5: Test Preferences Management

### Set Client Preferences

**Via UI:**
1. Go to `/summaries` as CLIENT_USER
2. Click "Settings"
3. Enable/disable weekly/monthly
4. Add email recipients
5. Select content to include
6. Click "Save Preferences"

**Via API:**
```bash
PATCH http://localhost:3000/api/summaries/preferences?clientId=<CLIENT_ID> \
  -H "Content-Type: application/json" \
  -d '{
    "summaryEnabled": true,
    "weeklyEnabled": true,
    "monthlyEnabled": true,
    "emailRecipients": ["user@example.com"],
    "includeResolvedIssues": true,
    "includeOpenIssues": true,
    "includeSLAMetrics": true,
    "includeCategoryBreakdown": true
  }'
```

## Step 6: Test Email HTML Rendering

### Save HTML to File
```bash
# From your cron endpoint response, copy htmlContent
# Save to file
echo '<html>...</html>' > summary.html

# Open in browser
open summary.html  # macOS
start summary.html  # Windows
xdg-open summary.html  # Linux
```

### Preview in Email Client
1. Copy HTML from `summary.htmlContent`
2. Paste into email client (Gmail, Outlook, etc.) draft
3. Verify layout, colors, and responsiveness

## Step 7: Test Edge Cases

### No Issues in Period
1. Create client with no issues
2. Generate summary
3. Verify "No issues" message in metrics

### Large Dataset
1. Create 100+ issues for a client
2. Generate summary
3. Check performance
4. Verify metrics calculated correctly

### Special Characters
1. Create issue with emojis, special chars in title/description
2. Generate summary
3. Verify HTML renders correctly

## Step 8: Manual Cron Testing

### Simulate Weekly Generation
```typescript
// Test if today is Monday
const now = new Date();
const dayOfWeek = now.getDay();
console.log("Is Monday?", dayOfWeek === 1);

// To test without waiting:
// 1. Edit app/api/cron/summaries/route.ts temporarily
// 2. Change: const generateWeekly = true;
// 3. Deploy/restart
// 4. Call endpoint
// 5. Revert change
```

### Simulate Monthly Generation
```typescript
// Test if today is 1st
const now = new Date();
const dayOfMonth = now.getDate();
console.log("Is 1st?", dayOfMonth === 1);

// Same workaround as above
```

## Troubleshooting

### Summaries not generating
- ✅ Check `CRON_SECRET` matches
- ✅ Verify database migration: `npx prisma migrate status`
- ✅ Check server logs for errors
- ✅ Ensure issues exist in period

### Metrics are wrong
- ✅ Verify period dates are correct
- ✅ Check issue filters match your data
- ✅ Ensure issues have required fields (status, priority, etc.)

### HTML not rendering
- ✅ Copy HTML to browser, check console for errors
- ✅ Verify no unclosed HTML tags
- ✅ Test in different email clients

### Email recipients not saving
- ✅ Verify email format validation
- ✅ Check API response for errors
- ✅ Verify PATCH request includes clientId

## Next Steps

1. **Configure External Cron**: Set up GitHub Actions or external cron service
2. **Add Email Integration**: Connect SendGrid/Mailgun to actually send emails
3. **Customize Templates**: Edit HTML in `lib/summaries.ts`
4. **Add More Metrics**: Extend `InternalMetrics` or `ClientMetrics` types
5. **Set Up Monitoring**: Log summary generation in analytics

## Useful Commands

```bash
# View all summaries
npx prisma query "SELECT * FROM Summary ORDER BY createdAt DESC LIMIT 10"

# View preferences
npx prisma query "SELECT * FROM ClientSummaryPreference"

# Reset summaries (dev only)
npx prisma db execute "DELETE FROM Summary WHERE createdAt > now() - interval '1 day'"

# View Prisma schema changes
git diff prisma/schema.prisma

# View migration
cat prisma/migrations/20260428152916_add_summary_enhancements/migration.sql
```

## Files to Reference

- **Summaries Service**: `lib/summaries.ts`
- **Cron Endpoint**: `app/api/cron/summaries/route.ts`
- **Summary API**: `app/api/summaries/route.ts`
- **Preferences API**: `app/api/summaries/preferences/route.ts`
- **Client UI**: `app/summaries/page.tsx`
- **Admin UI**: `app/admin/summaries/page.tsx`
- **Components**: `components/summaries/*.tsx`
- **Documentation**: `SUMMARIES_SETUP.md`

## Email Template Testing

### Download and Send
```bash
# Get summary HTML
curl http://localhost:3000/api/summaries?clientId=<ID> | jq '.summaries[0].htmlContent'

# Save to file
echo $CONTENT > /tmp/summary.html

# Test in browser
open /tmp/summary.html

# Or send via email for real testing
# (requires email service configured)
```

## Success Criteria

- ✅ Summaries generate via cron endpoint
- ✅ Data stored in database with correct format
- ✅ UI displays summaries correctly
- ✅ Preferences can be saved and updated
- ✅ HTML email templates render properly
- ✅ All role-based access controls work
- ✅ No sensitive data exposed
- ✅ Performance acceptable for large datasets

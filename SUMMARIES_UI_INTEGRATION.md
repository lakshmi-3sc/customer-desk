# Summaries UI Integration Guide

## Overview
Summaries have been strategically embedded into existing dashboards where users actually work - not in a separate tab. This follows UX best practices by reducing friction and increasing engagement.

---

## 📍 Where Summaries Now Appear

### 1. **Client Dashboard** (`/dashboard` for CLIENT_USER)
**Location:** Top of main content area, after welcome banner

**Component:** `SummaryCard` (Collapsible)

**What It Shows:**
- Weekly summary (can toggle to monthly)
- Collapsed view: Key metrics at a glance
  - Issues resolved
  - Currently open
  - Completion rate %
- Expanded view: Full metrics + SLA status + trends

**User Flow:**
```
Dashboard Opens
    ↓
Welcome Banner (Hi {firstName}...)
    ↓
📊 Weekly Summary Card (Collapsible)
    ↓
KPI Cards (existing)
    ↓
Recent Issues Table (existing)
```

### 2. **Internal 3SC Lead Dashboard** (`/dashboard/lead`)
**Location:** Right column, top of sidebar

**Component:** `RiskAlertWidget`

**What It Shows:**
- Active risk alerts extracted from summaries
- Color-coded by severity (critical/high/medium)
- Types of alerts:
  - 🚨 SLA Breaches
  - 🔺 Escalations
  - ⏰ Overdue issues

**User Flow:**
```
Lead Dashboard Opens
    ↓
KPI Cards (existing)
    ↓
Grid: Agent Performance (left) | Right Column:
                                    ↓
                        Risk Alert Widget (NEW)
                                    ↓
                        Escalation Alerts (existing)
                                    ↓
                        AI Routing (existing)
```

### 3. **Project Overview** (Upcoming - P1)
**Location:** New section in project details page

**Component:** `ProjectSummarySection`

**What It Will Show:**
- Monthly project summary
- Project health indicators
- Delivery metrics
- Issue category breakdown
- Recently resolved issues

**Status:** Component created, awaiting integration into project page

---

## 🧩 Components Created

### `SummaryCard.tsx`
**Purpose:** Collapsible summary widget for dashboards

**Props:**
```typescript
{
  title?: string              // "Weekly Summary"
  metrics: SummaryMetrics    // Data from API
  isExpanded?: boolean       // Initial state
  onToggle?: () => void      // Callback when toggled
  type?: "client" | "internal"  // Different metrics shown
  period?: string            // "Last 7 days"
}
```

**Features:**
- ✅ Collapsible/expandable
- ✅ Shows different metrics per role
- ✅ SLA status alert
- ✅ Metric cards with color coding
- ✅ Dark mode support
- ✅ Responsive design

### `RiskAlertWidget.tsx`
**Purpose:** Real-time risk alert display for internal team

**Props:**
```typescript
{
  limit?: number  // Max alerts to show (default: 5)
}
```

**Features:**
- ✅ Fetches latest summaries
- ✅ Extracts risk alerts (SLA, escalations, overdue)
- ✅ Color-coded severity levels
- ✅ Refresh button
- ✅ Empty state messaging
- ✅ Loading skeleton

### `ProjectSummarySection.tsx`
**Purpose:** Project-specific summary display

**Props:**
```typescript
{
  projectId: string    // Project ID
  clientId: string     // Client ID
}
```

**Features:**
- ✅ Monthly summary by default
- ✅ SLA status alert
- ✅ Metrics grid
- ✅ Category breakdown chart
- ✅ Recently resolved list
- ✅ Auto-refresh on mount

---

## 🔄 Data Flow

```
Backend (lib/summaries.ts)
         ↓
API Endpoints
  ├─ /api/summaries (GET)
  └─ /api/summaries/preferences (GET/PATCH)
         ↓
Components Fetch Data
  ├─ SummaryCard → /api/summaries?clientId=X&type=WEEKLY
  ├─ RiskAlertWidget → /api/summaries?isInternal=true&type=WEEKLY
  └─ ProjectSummarySection → /api/summaries?clientId=X&type=MONTHLY
         ↓
UI Renders Metrics
```

---

## 📊 Metrics Shown by Role

### CLIENT_USER
**Dashboard:** SummaryCard (collapsible)
- Resolved (highlighted)
- Open
- Completion rate
- SLA status

### CLIENT_ADMIN
**Dashboard:** SummaryCard (collapsible)
- Same as CLIENT_USER
- Can manage preferences (Settings button in future)

### THREESC_LEAD
**Lead Dashboard:** RiskAlertWidget
- SLA breaches
- Escalations
- Overdue issues
- Plus: Existing escalation alerts + AI routing

### THREESC_ADMIN
**Admin Dashboard:** RiskAlertWidget
- Same as THREESC_LEAD

---

## 🚀 Quick Integration Checklist

- ✅ **Components Created:**
  - `SummaryCard.tsx`
  - `RiskAlertWidget.tsx`
  - `ProjectSummarySection.tsx`

- ✅ **Integrated Into Pages:**
  - `app/dashboard/user/page.tsx` - Added SummaryCard
  - `app/dashboard/lead/page.tsx` - Added RiskAlertWidget

- ✅ **Backend Ready:**
  - `lib/summaries.ts` - Service functions
  - `app/api/cron/summaries/route.ts` - Generation endpoint
  - `app/api/summaries/route.ts` - Fetch endpoint
  - `app/api/summaries/preferences/route.ts` - Preferences endpoint

- ⏳ **Future Integration:**
  - Project Overview page - Add ProjectSummarySection
  - Email notifications - Send weekly/monthly summaries
  - Settings page - Full preference management UI

---

## 🎯 Testing Checklist

### Client Dashboard
- [ ] Log in as CLIENT_USER
- [ ] Navigate to `/dashboard`
- [ ] See SummaryCard below welcome banner
- [ ] Card is collapsed by default
- [ ] Click to expand
- [ ] See metrics grid
- [ ] See SLA status alert
- [ ] Dark mode works

### Lead Dashboard
- [ ] Log in as THREESC_LEAD
- [ ] Navigate to `/dashboard/lead`
- [ ] See RiskAlertWidget in right column
- [ ] See risk alerts (if any exist)
- [ ] Click refresh button
- [ ] Empty state message shows when no risks

### Data Generation
- [ ] Run: `curl -X POST http://localhost:3000/api/cron/summaries -H "x-cron-secret: test-secret"`
- [ ] Dashboard shows summary data
- [ ] Summaries expand/collapse correctly
- [ ] All metrics display correctly

---

## 🎨 UX Improvements Over Standalone Tab

| Aspect | Standalone Tab | Embedded Card |
|--------|---|---|
| **Discovery** | Users must find tab | Shown immediately on dashboard |
| **Context** | Separated from workflow | Right next to metrics they care about |
| **Engagement** | Low - feels like extra | High - natural fit in existing flow |
| **Mobile** | Extra navigation | Already visible |
| **Perception** | "Report" | "Quick Health Check" |

---

## 📋 File Reference

### New Components
- `components/summaries/SummaryCard.tsx` (150+ lines)
- `components/summaries/RiskAlertWidget.tsx` (200+ lines)
- `components/summaries/ProjectSummarySection.tsx` (250+ lines)

### Modified Pages
- `app/dashboard/user/page.tsx` (added SummaryCard import + state + JSX)
- `app/dashboard/lead/page.tsx` (added RiskAlertWidget import + JSX)

### Backend (Unchanged)
- `lib/summaries.ts` - Service functions
- `app/api/summaries/*` - API endpoints
- `app/api/cron/summaries/route.ts` - Cron job

---

## 🔮 Future Enhancements

### Project Overview Integration
```typescript
import { ProjectSummarySection } from "@/components/summaries/ProjectSummarySection";

// In project overview page:
<ProjectSummarySection projectId={projectId} clientId={clientId} />
```

### Email Integration (Phase 2)
- Weekly summary email to CLIENT_ADMIN
- Monthly report PDF
- Slack notifications for THREESC_LEAD

### Settings UI (Phase 2)
- Full preference management at `/settings/summaries`
- Email recipient management
- Frequency selection
- Content customization

---

## ✅ Success Metrics

- ✅ Summaries visible without extra navigation
- ✅ Clear, actionable insights at a glance
- ✅ Reduces need to scan all tickets
- ✅ Role-based content tailored to needs
- ✅ Zero disruption to existing functionality
- ✅ Professional, polished UI

---

## 🚨 Troubleshooting

### Summary Card Not Showing
1. Check if summary data exists: `curl http://localhost:3000/api/summaries?clientId=<id>`
2. Run cron generator: `curl -X POST http://localhost:3000/api/cron/summaries -H "x-cron-secret: test-secret"`
3. Check browser console for errors

### Risk Alerts Not Showing
1. Verify internal summaries generated: `curl http://localhost:3000/api/summaries?isInternal=true`
2. Check if risk thresholds are met (SLABreaches > 0, etc.)
3. Refresh the page

### Metrics Look Wrong
1. Check raw API response: `/api/summaries?clientId=<id>&type=WEEKLY`
2. Verify metrics calculation in `lib/summaries.ts`
3. Check that issues have correct status/priority/dates

---

**Status:** ✅ Ready for Testing & Deployment
**Next Phase:** Email integration + Project overview integration

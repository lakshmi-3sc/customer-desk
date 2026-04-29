# Test Summaries Now - Quick Guide

## 🚀 Quick Start (5 minutes)

### Step 1: Restart dev server
```bash
npm run dev
```

### Step 2: Generate test summaries
```bash
curl -X POST http://localhost:3000/api/cron/summaries \
  -H "x-cron-secret: test-secret"
```

Expected output:
```json
{
  "success": true,
  "results": {
    "weeklyGenerated": 5,
    "monthlyGenerated": 0
  }
}
```

---

## 👁️ What to Look For

### **Test 1: Client Dashboard**

1. Log in as **CLIENT_USER**
2. Navigate to `/dashboard` (or click "Dashboard" in sidebar)
3. **You should see:**
   ```
   [Welcome Banner]
   
   📊 Weekly Summary ▼        <-- THIS IS NEW
   ✓ 8 resolved • 2 open • 80% complete
   
   [Click the card to expand]
   ```

4. **Click the card header** to expand
5. **You should see:**
   ```
   ✅ SLA Compliant
   
   [Metrics Grid]
   Total Submitted: 12
   Resolved: 8  ← highlighted in green
   Completion Rate: 67%
   Open: 2
   ```

6. **Click again** to collapse
7. **Should show compact view again**

---

### **Test 2: Lead Dashboard**

1. Log in as **THREESC_LEAD** (or **THREESC_ADMIN**)
2. Navigate to `/dashboard/lead`
3. **You should see:**
   ```
   [KPI Cards at top]
   
   [Left: Agent Performance Table]  [Right: Risk Alerts ← NEW]
   ```

4. **Look at right column, top section**
5. **You should see:**
   ```
   🚨 Risk Alerts  [Refresh button]
   
   ⚠️ CRITICAL
   3 SLA breaches
   
   🔺 HIGH
   2 escalations
   
   ⏰ MEDIUM
   5 overdue issues
   ```

6. **Click refresh button**
7. **Alerts should update/reload**

---

### **Test 3: Sidebar Navigation**

1. Open sidebar
2. **Should NOT see:**
   - ❌ "Summaries" link (CLIENT_USER)
   - ❌ "Summary Reports" link (LEAD section)
   - ❌ "Summary Reports" link (ADMIN section)
3. **Summaries only visible in dashboards now ✅**

---

## ✅ Success Criteria

| Check | Expected | Status |
|-------|----------|--------|
| No build errors | ✅ Clean build | Check terminal |
| No sidebar "Summaries" | ✅ Hidden | Check sidebar |
| Client dashboard shows card | ✅ Visible | Check `/dashboard` |
| Card expands/collapses | ✅ Works | Test clicking |
| Lead dashboard shows alerts | ✅ Visible | Check `/dashboard/lead` |
| Alerts show correct data | ✅ Populated | Generate test data |

---

## 🐛 Troubleshooting

### Problem: No Summary Card visible
**Solution:** 
1. Did you generate test data? Run the curl command above
2. Check browser console (F12) for errors
3. Verify summary data exists: `curl http://localhost:3000/api/summaries?clientId=<id>`

### Problem: No Risk Alerts visible
**Solution:**
1. Generate test data (see Step 2 above)
2. Make sure you're logged in as THREESC_LEAD
3. Check if there are actually SLA breaches/escalations in your test data

### Problem: Summary card shows but won't expand
**Solution:**
1. Check browser console for JavaScript errors (F12)
2. Verify the metrics JSON is valid from the API
3. Try hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

### Problem: "Summaries" link still shows in sidebar
**Solution:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Restart dev server (Ctrl+C, then `npm run dev`)
3. Hard refresh browser

---

## 📊 Visual Overview

### Before (Bad UX)
```
Sidebar
├── Overview
├── Issues
├── Knowledge Base
├── Summaries ← SEPARATE TAB (users ignored this)
└── Notifications

User had to: Click Summaries tab → See summaries
Result: Low engagement
```

### After (Good UX)
```
Dashboard/Lead
├── [Content users care about]
├── 📊 Summary Widget ← EMBEDDED (always visible)
├── More content users care about
└── ...

User sees summaries: Automatically, zero extra navigation
Result: High engagement
```

---

## 🎯 Expected Behavior

**SummaryCard Behavior:**
- Starts collapsed (compact view)
- Shows key metrics at a glance
- Click to expand for full details
- Click again to collapse
- Displays SLA status with color coding
- Responsive on mobile

**RiskAlertWidget Behavior:**
- Shows list of active risks
- Color-coded by severity (red/orange/yellow)
- Has refresh button
- Updates when you click refresh
- Shows "No active risks" when clean
- Loads data on component mount

---

## 📝 Notes

- ✅ Old `/summaries` page is **completely deleted**
- ✅ Old `/admin/summaries` page is **completely deleted**
- ✅ Navigation links **completely removed**
- ✅ New components are **embedded** in existing dashboards
- ✅ Zero disruption to other features
- ✅ Works with existing authentication
- ✅ Works with existing API

---

## 🚀 You're Done When

✅ You can see:
1. Summary card on client dashboard (with expand/collapse working)
2. Risk alerts on lead dashboard (with refresh working)
3. No "Summaries" in sidebar anymore
4. No errors in browser console

**That's it!** Summaries are now properly integrated. 🎉

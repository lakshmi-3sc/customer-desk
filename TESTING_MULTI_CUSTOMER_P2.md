# Testing Multi-Customer Support P2 Implementation

## Quick Start: Run Dev Server

```bash
cd "C:/Users/Guru Lakshmi/Repos/Customer_Portal/customer-desk"
npm run dev
```

Then open: **http://localhost:3000**

---

## Test Checklist

### ✅ Test 1: Check Workspace Switcher Appears

1. **Login** to the app (use any test account)
2. **Look at the sidebar** - Check header area below the "3SC Connect" logo
3. **Expected**: See workspace switcher dropdown IF user has multiple workspaces assigned
4. **If only 1 workspace**: Switcher won't show (this is correct)

---

### ✅ Test 2: Check Sidebar Branding

1. **Open the app**
2. **Look at sidebar header** - Should show:
   - ✅ Workspace logo (or initials if no logo)
   - ✅ Workspace name (not hardcoded "3SC Connect")
   - ✅ "Workspace" or "Portal" subtitle based on role
3. **Check sidebar color** - Should be colored based on workspace industry:
   - Technology: Blue (#2563eb)
   - Healthcare: Red (#dc2626)
   - Finance: Dark Blue (#1e40af)
   - Default: 3SC Blue (#0747A6)

---

### ✅ Test 3: Verify Browser Console (No Errors)

1. **Open DevTools**: Press `F12` → **Console** tab
2. **Login and navigate**
3. **Expected**: No red error messages related to:
   - `workspace-context`
   - `useWorkspace`
   - API `/workspaces` calls
4. **If errors**: Check Network tab for failed API calls

---

### ✅ Test 4: Check Browser Network Requests

1. **Open DevTools** → **Network** tab
2. **Reload the page**
3. **Look for requests**: 
   - 🔍 Search for `/api/workspaces`
   - Should see: `GET /api/workspaces` → **Status 200**
   - Response should contain workspace data with `id`, `name`, `logoUrl`, `primaryColor`

**Example Response:**
```json
{
  "workspaces": [
    {
      "id": "cuid123",
      "name": "Acme Corp",
      "logoUrl": "data:image/png;base64,...",
      "industry": "technology",
      "primaryColor": "#2563eb"
    }
  ]
}
```

---

### ✅ Test 5: Check localStorage

1. **Open DevTools** → **Application/Storage** tab
2. **Expand "Local Storage"**
3. **Click on your app URL** (e.g., `localhost:3000`)
4. **Look for**: 
   - Key: `current-workspace`
   - Value: Should contain the workspace ID (e.g., `cuid123`)
5. **Expected**: This value persists across page reloads

---

### ✅ Test 6: Test Workspace Switching (If Multiple Workspaces)

**Prerequisites**: Account must have access to 2+ workspaces

1. **Look at sidebar header** → Click on workspace name
2. **Should see dropdown** with list of all accessible workspaces
3. **Click different workspace** → App should:
   - Update sidebar branding (logo, name, color)
   - Redirect to `/dashboard`
   - Load data for that workspace
   - Update `current-workspace` in localStorage

---

### ✅ Test 7: Verify Role-Based Access

#### Test as CLIENT_USER:
```
Login with CLIENT_USER account
→ Should see ONLY their assigned workspace
→ Workspace switcher should NOT appear (only 1 workspace)
```

#### Test as CLIENT_ADMIN:
```
Login with CLIENT_ADMIN account
→ Should see their workspace
→ Sidebar shows "Workspace" subtitle
→ Should see "Workspace Settings" option in sidebar
```

#### Test as 3SC_TEAM (Lead/Admin/Agent):
```
Login with 3SC team account
→ Workspace switcher SHOULD appear
→ Can see ALL active client workspaces
→ Can switch between any workspace
```

---

### ✅ Test 8: Check API Authorization

**Test 1: Unauthorized Access**
```bash
# In browser console, try:
fetch('/api/workspaces')
  .then(r => r.json())
  .then(d => console.log(d))
```
Expected: Either works (if logged in) or returns `{ error: "Unauthorized" }`

**Test 2: User Can Only See Own Workspace**
```bash
# Login as CLIENT_USER
# Check response from GET /api/workspaces
# Should return only 1 workspace (their assigned one)
```

---

### ✅ Test 9: Visual Verification

| Element | Expected | ✅/❌ |
|---------|----------|-------|
| Sidebar header shows workspace logo | Yes | |
| Workspace name displayed in header | Yes | |
| Sidebar color matches industry | Yes | |
| Workspace switcher visible (multi-workspace users) | Yes | |
| localStorage has `current-workspace` key | Yes | |
| No console errors on workspace switch | Yes | |
| /api/workspaces returns correct data | Yes | |

---

## Debugging Tips

### If Workspace Switcher Doesn't Appear:
1. Check if user has multiple workspaces in database:
   ```sql
   SELECT DISTINCT cm.clientId FROM ClientMember cm 
   WHERE cm.userId = 'user-id';
   ```
2. If only 1 result: Switcher intentionally hidden (correct behavior)
3. If 2+ results: Check browser console for errors

### If Workspace Branding Not Showing:
1. Check Network tab → `/api/workspaces` response
2. Verify `logoUrl` is not null
3. Check browser console for image load errors
4. Try hard refresh: `Ctrl+Shift+R`

### If Workspace Switch Doesn't Work:
1. Check Network tab → should redirect to `/dashboard`
2. Verify localStorage updated with new workspace ID
3. Check console for `useWorkspace` hook errors
4. Verify user has access to the workspace (check ClientMember table)

### If localStorage Not Persisting:
1. Check if cookies/storage enabled in browser
2. Try clearing browser cache
3. Check browser console for storage errors
4. Verify not in private/incognito mode

---

## Database Queries for Testing

### Check Workspaces for a User:
```sql
SELECT c.id, c.name, c.logoUrl, c.industry 
FROM Client c
JOIN ClientMember cm ON c.id = cm.clientId
WHERE cm.userId = 'user-uuid'
AND c.isActive = true;
```

### Check if User Can Access Multiple Workspaces:
```sql
SELECT COUNT(DISTINCT clientId) as workspace_count
FROM ClientMember 
WHERE userId = 'user-uuid';
```

### Check 3SC Team Members:
```sql
SELECT id, name, role 
FROM User 
WHERE role LIKE 'THREESC_%';
```

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Workspace switcher not showing | User has 1 workspace | Add user to 2+ clients in DB |
| Sidebar always blue | No workspace data | Check /api/workspaces endpoint response |
| localStorage not updating | Browser storage disabled | Enable in browser settings |
| Can't switch workspaces | Missing ClientMember record | Add user to client in DB |
| Wrong workspace data shows | Cached data | Hard refresh (Ctrl+Shift+R) |

---

## Success Criteria ✅

Implementation is **WORKING** if:

1. ✅ Sidebar displays workspace branding (logo, name, color)
2. ✅ Workspace switcher appears for users with multiple workspaces
3. ✅ User can switch workspaces via dropdown
4. ✅ Browser localStorage has `current-workspace` key
5. ✅ No red errors in browser console
6. ✅ `/api/workspaces` endpoint returns correct data
7. ✅ Different workspaces have different colors based on industry
8. ✅ Role-based access works (3SC sees all, clients see only theirs)
9. ✅ Workspace preference persists on page reload
10. ✅ Build completes without workspace-related errors

---

## Next Steps (Post-Testing)

If everything works:
1. Test with production-like data
2. Test with multiple users in different roles
3. Test workspace switching with real data changes
4. Add workspace settings page for custom branding (future P2.5)

If issues found:
1. Check console errors for specific failures
2. Review API response format
3. Verify database data is correct
4. Check user role permissions

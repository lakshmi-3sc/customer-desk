# In-App Notifications Implementation

## System Overview

```
Database (Notification model)
         ↓
    API Endpoint (/api/notifications)
         ↓
    Frontend Components
    ├─ Bell Icon (Popup)
    └─ Full Notifications Page
```

---

## 1. DATABASE LAYER - Notification Model

**File:** `prisma/schema.prisma`

```prisma
model Notification {
  id        String           @id @default(cuid())
  userId    String
  type      NotificationType
  title     String
  message   String
  issueId   String?
  isRead    Boolean          @default(false)
  createdAt DateTime         @default(now())
  issue     Issue?           @relation(fields: [issueId], references: [id])
  user      User             @relation(fields: [userId], references: [id])
}

enum NotificationType {
  ISSUE_ASSIGNED
  STATUS_UPDATED
  SLA_WARNING
  ESCALATION
  NEW_COMMENT
  ISSUE_RESOLVED
}
```

**Key fields:**
- `userId` - Who gets the notification
- `type` - What kind of event
- `title` - Short summary ("John mentioned you")
- `message` - Details ("Check the comment on CRSI-1025")
- `issueId` - Link to ticket (optional)
- `isRead` - Soft delete (not deleted, just marked read)

---

## 2. API LAYER - Fetch Notifications

**File:** `app/api/notifications/route.ts`

### **What it does:**

```typescript
GET /api/notifications

Returns:
{
  notifications: [
    {
      id: "notif_123",
      type: "comment",
      title: "John replied on CRSI-1025",
      body: "Thanks for the update...",
      issueKey: "CRSI-1025",
      issueId: "abc123",
      createdAt: "2026-04-23T10:30:00Z"
    },
    ...
  ],
  unreadCount: 3
}
```

### **Data sources:**

**1. From Notification model** (explicit in-app notifications)
```typescript
const userNotifications = await prisma.notification.findMany({
  where: { userId: currentUser.id },
  orderBy: { createdAt: "desc" },
  take: 30
});
```

**2. From IssueHistory** (status/field changes by others)
```typescript
const history = await prisma.issueHistory.findMany({
  where: { issue: issueWhere, NOT: { changedById: currentUser.id } },
  take: 30
});
// Transform to: "Status changed to IN_PROGRESS"
```

**3. From Comments** (replies on user's issues)
```typescript
const comments = await prisma.comment.findMany({
  where: { issue: issueWhere, NOT: { authorId: currentUser.id } },
  take: 20
});
// Transform to: "John replied: Thanks for the update..."
```

**4. From Issues** (SLA warnings)
```typescript
const slaIssues = await prisma.issue.findMany({
  where: { ...issueWhere, OR: [{ slaBreached: true }, { slaBreachRisk: true }] },
  take: 5
});
// Transform to: "SLA breached on CRSI-1025"
```

### **Scoping (who sees what):**

```typescript
let issueWhere: any = {};

if (role === "CLIENT_USER") {
  issueWhere.raisedById = currentUser.id;  // Only own tickets
} else if (!is3SC) {
  issueWhere.clientId = membership.clientId;  // Only client's tickets
}
// 3SC sees everything
```

---

## 3. UI LAYER - Notification Bell

**File:** `components/notification-bell.tsx`

### **Component Structure:**

```
NotificationBell
├─ Bell Icon + Badge (unread count)
├─ Popup Panel (when clicked)
│  ├─ Header ("Mark all read")
│  ├─ Notification List (max 8)
│  └─ Footer ("View all notifications")
└─ Auto-refresh (every 60 seconds)
```

### **Key Features:**

**1. Fetch on mount:**
```typescript
useEffect(() => {
  fetchNotifications();  // Initial fetch
  const interval = setInterval(fetchNotifications, 60000);  // Every 60 seconds
  return () => clearInterval(interval);
}, []);
```

**2. Local storage for "read" state:**
```typescript
// Store read notification IDs in browser
localStorage.setItem("notif-read", JSON.stringify([...readIds]));

// Calculate unread count
const newCount = notifications.filter(n => !readIds.has(n.id)).length;
setUnreadCount(Math.min(newCount, 9));  // Cap at 9+
```

**3. Visual indicators:**
```typescript
// Unread = blue background + dot
isUnread && "bg-blue-50/50 dark:bg-blue-950/20"
isUnread && <span className="w-1.5 h-1.5 rounded-full bg-[#0052CC]" />

// Type-specific colors
const TYPE_META = {
  comment: { icon: MessageSquare, color: "text-purple-600", bg: "bg-purple-100" },
  sla: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-100" },
  status_change: { icon: Info, color: "text-blue-600", bg: "bg-blue-100" },
  // ...
};
```

**4. Click to view:**
```typescript
onClick={() => {
  // Mark as read
  localStorage.setItem("notif-read", JSON.stringify([...newIds]));
  // Navigate to ticket
  router.push(`/tickets/${n.issueKey ?? n.issueId}`);
  setOpen(false);
}}
```

---

## 4. Full Page - Notifications List

**File:** `app/notifications/page.tsx`

### **Features:**

**1. Group by date:**
```typescript
const grouped = {};
for (const n of notifications) {
  const label = d.toDateString() === now.toDateString() ? "Today" : "Yesterday" : "...";
  grouped[label].push(n);
}
// Display sections: [Today] [Yesterday] [April 20, 2026] ...
```

**2. Type-specific rendering:**
```typescript
const TYPE_META = {
  status_change: { label: "Status Update" },
  field_change: { label: "Field Update" },
  comment: { label: "New Reply" },
  sla: { label: "SLA Alert" },
};
```

**3. Mark all read:**
```typescript
const markAllRead = () => {
  const ids = new Set(notifications.map(n => n.id));
  localStorage.setItem("notif-read", JSON.stringify([...ids]));
  setReadIds(ids);
};
```

---

## 5. Creating Notifications

### **Where notifications are created:**

**1. Status changes:**
```typescript
// app/api/dashboard/tickets/[id]/update/route.ts
if (status changed) {
  await prisma.notification.create({
    userId: ticket.assignedToId,
    type: "STATUS_UPDATED",
    title: `Status changed to ${newStatus}`,
    message: `${ticket.title} is now ${newStatus}`,
    issueId: ticket.id
  });
}
```

**2. Comments with @mentions:**
```typescript
// app/api/dashboard/tickets/[id]/comments/route.ts
const mentions = content.match(/@(\w+)/g);
for (const mention of mentions) {
  const user = await findUserByName(mention);
  await prisma.notification.create({
    userId: user.id,
    type: "NEW_COMMENT",
    title: `${author.name} mentioned you`,
    message: content.slice(0, 100),
    issueId: ticketId
  });
}
```

**3. Assignments:**
```typescript
// When ticket assigned to agent
if (assignedToId && assignedToId !== oldAssignedToId) {
  await prisma.notification.create({
    userId: assignedToId,
    type: "ISSUE_ASSIGNED",
    title: `${updatedBy} assigned this to you`,
    message: ticket.title,
    issueId: ticketId
  });
}
```

---

## 6. Data Flow Diagram

```
USER ACTION
     ↓
┌────────────────────────────┐
│ Create Comment / Update    │
│ Status / Assign Ticket     │
└────────────┬───────────────┘
             ↓
┌────────────────────────────┐
│ API Route (create/update)  │
│ - Saves to Notification    │
│ - Or IssueHistory/Comment  │
└────────────┬───────────────┘
             ↓
        DATABASE
   (Notification table)
             ↓
┌────────────────────────────┐
│ Client polls /api/notif    │
│ (Every 60 seconds OR on    │
│  user action)              │
└────────────┬───────────────┘
             ↓
┌────────────────────────────┐
│ Bell Badge Updates         │
│ Popup Shows New Items      │
│ User clicks → Navigate     │
└────────────────────────────┘
```

---

## 7. Notification Types & Icons

| Type | Icon | Color | When Created |
|------|------|-------|--------------|
| `NEW_COMMENT` | Message | Purple | Someone replies to ticket |
| `ISSUE_ASSIGNED` | Arrow | Green | Ticket assigned to user |
| `STATUS_UPDATED` | Info | Blue | Ticket status changes |
| `SLA_WARNING` | Alert | Orange | SLA at risk |
| `ESCALATION` | Alert | Red | Ticket escalated |
| `ISSUE_RESOLVED` | Check | Green | Ticket marked resolved |

---

## 8. Current Implementation Status

### **✅ Fully Working:**
- Bell icon with unread count
- Fetch from multiple sources (Notification, IssueHistory, Comments, SLA)
- Group notifications by date
- Mark as read (local storage)
- Click to navigate to ticket
- Type-specific icons & colors
- Auto-refresh every 60 seconds

### **❌ Not Yet Implemented:**
- @mention detection for comments (plan exists)
- Assignment notifications (plan exists)
- Status change notifications (plan exists)
- Persistent "read" state (currently local storage only)
- Real-time updates (currently polling every 60sec)
- Email notifications

---

## 9. Efficiency Notes

✅ **Efficient:**
- Single API call to fetch all notification types
- Local storage caching (no DB writes for read status)
- Polling instead of WebSockets (simpler, scales)
- Only recent 30 notifications fetched
- Grouped display (no N+1 queries)

⚠️ **Could Improve:**
- WebSocket for real-time (instead of 60sec polling)
- Batch create notifications (instead of one at a time)
- Persistent read state (instead of localStorage)
- Notification preferences (mute certain types)

---

## Demo Flow

```
1. User creates ticket
   ↓
2. Triggers notification creation
   ↓
3. Notification stored in DB
   ↓
4. Bell component fetches (or auto-refresh at 60sec)
   ↓
5. Badge shows unread count
   ↓
6. User clicks bell → popup shows notifications
   ↓
7. User clicks notification → marked read + navigates to ticket
```

**Simple, effective, scalable!** 🔔

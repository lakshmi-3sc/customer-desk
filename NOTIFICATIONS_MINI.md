# In-App Notifications - Mini Notes

## **3 Parts**

### **1. Database**
- `Notification` model stores: userId, type, title, message, issueId
- Types: NEW_COMMENT, ISSUE_ASSIGNED, STATUS_UPDATED, SLA_WARNING, etc.

### **2. API** (`/api/notifications`)
- Fetches from 4 sources:
  1. `Notification` table (explicit notifications)
  2. `IssueHistory` (status/field changes by others)
  3. `Comment` (replies on your issues)
  4. `Issue` (SLA warnings/breaches)
- Combines, sorts by date, returns 30 items

### **3. UI**
- **Bell Component** - Shows badge + popup (max 8 notifs)
  - Polls every 60 seconds
  - Tracks read/unread in localStorage
  - Click → navigate to ticket
- **Notifications Page** - Full list grouped by date
  - Today / Yesterday / April 20, etc.
  - Mark all read option

---

## **How It Works**

```
User takes action (comment/assign/status change)
         ↓
Create Notification record in DB
         ↓
Bell component fetches /api/notifications (every 60sec)
         ↓
Shows unread count badge
         ↓
User clicks bell → popup shows notifications
         ↓
Click notification → mark read + go to ticket
```

---

## **Key Points**

✅ **Simple** - No WebSockets, just REST polling  
✅ **Efficient** - Single API call, fetches from multiple sources  
✅ **Scoped** - CLIENT_USER sees only own tickets, 3SC sees all  
✅ **Grouped** - Notifications by date (Today, Yesterday, etc.)  
✅ **Persistent** - Stored in DB, read status in localStorage  

---

## **Currently Implemented**
- ✅ Fetch & display notifications
- ✅ Mark as read
- ✅ Type-specific icons/colors
- ✅ Navigation to tickets

## **TODO (Not yet)**
- ❌ @mentions in comments
- ❌ Auto-create on assignment/status change
- ❌ Real-time WebSocket updates
- ❌ Email notifications

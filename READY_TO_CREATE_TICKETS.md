# 3 Ready-to-Create Tickets - Will Show Similar Tickets

Just copy-paste these into the create ticket form. Similar tickets will appear in the ticket detail page.

---

## Ticket #1: Password Reset Problem ⭐

**Copy to Create Ticket Form:**

| Field | Value |
|-------|-------|
| **Category** | ACCESS_SECURITY |
| **Priority** | HIGH |
| **Title** | Cannot reset password - getting invalid token error |
| **Description** | I'm trying to reset my password but when I click the reset link from the email, I get an "Invalid reset token" error. The link looks valid and I clicked it within an hour of receiving it. I've tried clearing browser cache but still getting the same error. This is urgent as I can't access my account. |

**Will match these seeded tickets:**
- ✅ "Unable to reset password" (95%+ match)
- ✅ "Password reset failing for specific email domain" (85%+ match)
- ✅ "Two-factor authentication not working" (70%+ match)

---

## Ticket #2: Mobile Login Crash 📱

**Copy to Create Ticket Form:**

| Field | Value |
|-------|-------|
| **Category** | BUG |
| **Priority** | CRITICAL |
| **Title** | App crashing when signing in on iPhone |
| **Description** | The login page completely crashes when I try to sign in using Safari on my iPhone. After entering my credentials and tapping Sign In, the app becomes unresponsive. I have to force close and restart the app. Login works fine on my desktop using Chrome. This is blocking all mobile access. |

**Will match these seeded tickets:**
- ✅ "Login page crashes on mobile devices" (97%+ match)
- ✅ "Cannot export data due to memory error" (65%+ match)

---

## Ticket #3: Dashboard Performance 🐢

**Copy to Create Ticket Form:**

| Field | Value |
|-------|-------|
| **Category** | PERFORMANCE |
| **Priority** | HIGH |
| **Title** | Dashboard loading very slowly during business hours |
| **Description** | The main dashboard page is taking 8-10 seconds to fully load when I use it between 9 AM and 12 PM. Usually it loads in about 2 seconds. This is making it difficult to view the data I need quickly each morning. The slowness only affects the dashboard, other parts of the app are fine. |

**Will match these seeded tickets:**
- ✅ "Dashboard loading slowly during peak hours" (98%+ match)
- ✅ "API response time exceeds SLA" (85%+ match)

---

## How to Test:

1. **Go to:** `/create-ticket`
2. **Select Project:** (any project)
3. **For each ticket above:**
   - Copy the Title
   - Copy the Description
   - Select Category
   - Select Priority
   - Click "Create Issue"
4. **On ticket detail page:** Scroll down right panel to see "Similar Resolved" section
5. Should show 2-3 similar tickets with confidence scores

---

## Expected Results:

✅ **Ticket #1:** Shows 3 similar tickets (password & auth related)  
✅ **Ticket #2:** Shows 2 similar tickets (mobile/crash related)  
✅ **Ticket #3:** Shows 2 similar tickets (performance related)  

Each with confidence % (word match ≥40%, or borderline 20-40% + AI verified)

---

## Demo Script:

```
"I'll create a new ticket about a password reset issue. 
The system will analyze it and show similar resolved tickets.
This helps customers find solutions without creating duplicates."

[Create Ticket #1]

"See how it found 3 similar tickets? Users can click to view 
how those were resolved, potentially solving their problem without 
needing agent assistance."
```

---

**Ready to demo!** 🚀

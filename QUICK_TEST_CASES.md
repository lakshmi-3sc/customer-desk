# Quick Test Cases with Project Selection

## Test 1: Data Access Issue (Semantic Search) ✅

### Form Inputs:
```
PROJECT:     Select any project from dropdown (e.g., "Dashboard", "Portal", "CRM")
TITLE:       "Unable to access my transaction history"
DESCRIPTION: "I cannot view my past purchases or transaction logs. 
             The history section is empty even though I should have data. 
             I need to see all my previous orders and payment history."
PRIORITY:    (Let AI suggest)
CATEGORY:    (Let AI suggest)
ATTACHMENTS: Skip
```

### What to Verify:
1. ✅ **Semantic Search Works**: Similar tickets appear in dropdown
   - Look for tickets with different wording but same meaning
   - Examples: "Cannot see past transactions", "Unable to view order history"
   
2. ✅ **AI Suggestions Display**: Blue badges appear
   - Category badge: "🤖 AI Suggested: DATA_ACCURACY"
   - Priority badge: "🤖 AI Suggested: HIGH"
   
3. ✅ **Click-to-Fill Works**: Click a badge
   - Category select updates to suggested value
   - Priority select updates to suggested value

4. ✅ **Tooltip Works**: Hover over badge
   - Shows: "Confidence: 85% - Suggested based on content analysis"

---

## Test 2: Feature Request (AI Classification) ✅

### Form Inputs:
```
PROJECT:     Select any project (e.g., "Product", "Engineering", "Mobile")
TITLE:       "Request: Add dark mode option"
DESCRIPTION: "I would love a dark mode feature for the application. 
             Many users prefer dark mode for better eye comfort and accessibility. 
             It would help reduce eye strain during long sessions. 
             Could this be added in the next release?"
PRIORITY:    (Let AI suggest)
CATEGORY:    (Let AI suggest)
ATTACHMENTS: Skip
```

### What to Verify:
1. ✅ **AI Category Suggestion**: Should be FEATURE_REQUEST
   - Badge shows: "🤖 AI Suggested: FEATURE_REQUEST"
   - Confidence should be 90%+ (very clear pattern)
   
2. ✅ **AI Priority Suggestion**: Should be LOW or MEDIUM
   - Feature requests are usually low priority
   - Badge shows: "🤖 AI Suggested: LOW"
   
3. ✅ **Few Similar Tickets**: May find 0-1 similar tickets
   - Feature requests don't usually have many similar resolved items
   
4. ✅ **One-Click Selection**: Click "FEATURE_REQUEST" badge
   - Category field auto-fills immediately
   - No similar tickets section should be minimal

---

## Test 3: Performance/Bug Issue ✅

### Form Inputs:
```
PROJECT:     Select any project (e.g., "Backend", "Infrastructure", "API")
TITLE:       "Application is extremely slow and unresponsive"
DESCRIPTION: "The app is running very sluggish today. Taking forever to load pages. 
             Clicking buttons takes 5+ seconds to register. 
             This is making it impossible to work. 
             Started this morning. Please help ASAP."
PRIORITY:    (Let AI suggest)
CATEGORY:    (Let AI suggest)
ATTACHMENTS: Optional - add error screenshot if you have one
```

### What to Verify:
1. ✅ **Semantic Search**: Similar performance tickets appear
   - Different wording: "slow response", "laggy interface", "delays"
   - Same meaning: System not performing well
   
2. ✅ **AI Category**: Should suggest PERFORMANCE or BUG
   - Badge shows: "🤖 AI Suggested: PERFORMANCE"
   - Confidence: 85%+
   
3. ✅ **AI Priority**: Should be HIGH or CRITICAL
   - Badge shows: "🤖 AI Suggested: CRITICAL"
   - Performance issues block users immediately
   
4. ✅ **Multiple Similar Tickets**: Should find 2-3 similar items
   - Performance issues are common
   - Semantic search finds them despite wording differences

---

## Test 4: UI Bug (High Confidence Match) ✅

### Form Inputs:
```
PROJECT:     Select any project (e.g., "Frontend", "Web", "Mobile")
TITLE:       "Buttons on dashboard not working"
DESCRIPTION: "The save and delete buttons aren't responding to clicks anymore. 
             I click them multiple times but nothing happens. 
             The UI updates from the server come through fine though. 
             This affects my daily workflow significantly."
PRIORITY:    (Let AI suggest)
CATEGORY:    (Let AI suggest)
ATTACHMENTS: Skip
```

### What to Verify:
1. ✅ **Semantic Search**: Should find bug tickets
   - Even if original tickets say "Click targets unresponsive"
   - Even if they mention different buttons
   
2. ✅ **AI Category**: Should definitely be BUG
   - Badge shows: "🤖 AI Suggested: BUG"
   - Confidence: 95%+ (very clear bug pattern)
   
3. ✅ **AI Priority**: Should be CRITICAL or HIGH
   - Badge shows: "🤖 AI Suggested: CRITICAL"
   - Broken buttons = blocked users
   
4. ✅ **Strong Similar Results**: Multiple similar bug tickets
   - This is a common issue
   - Should show 2-3 similar resolved bugs

---

## Test 5: Access/Security Issue ✅

### Form Inputs:
```
PROJECT:     Select any project (e.g., "Security", "Auth", "Platform")
TITLE:       "Cannot log in with new password"
DESCRIPTION: "After resetting my password, I can't log in anymore. 
             I get an error saying 'Authentication failed' even though 
             I'm typing the password correctly. 
             The old password still works though. 
             I need access urgently."
PRIORITY:    (Let AI suggest)
CATEGORY:    (Let AI suggest)
ATTACHMENTS: Skip
```

### What to Verify:
1. ✅ **Semantic Search**: Finds authentication/access issues
   - Despite different wording like "login failed", "credentials not accepted"
   
2. ✅ **AI Category**: Should suggest ACCESS_SECURITY
   - Badge shows: "🤖 AI Suggested: ACCESS_SECURITY"
   - Confidence: 85%+
   
3. ✅ **AI Priority**: Should be HIGH or CRITICAL
   - Users can't access system = urgent
   - Badge shows: "🤖 AI Suggested: HIGH"
   
4. ✅ **Related Tickets**: Should find security/auth related tickets

---

## Step-by-Step Test Process

### For Each Test Case:

```
1. Navigate to: /create-ticket
   
2. Select Project:
   - Click dropdown
   - Choose any available project
   - Click to select
   
3. Enter Title:
   - Paste title from test case above
   
4. Enter Description:
   - Paste description from test case above
   - DO NOT press Tab/Click away yet
   
5. Wait 500-1000ms:
   - You should see "Smart Suggestions" dropdown appear
   - Below description field
   
6. Check Suggestions:
   - Look at "Similar Resolved Tickets" section
   - Look at "Related Articles" section
   - Note which ones appear (or don't)
   
7. Scroll to Category & Priority:
   - Should see blue badges if AI suggestions available
   - Hover over badge to see confidence & reasoning
   
8. Click a Badge:
   - Click category badge
   - Watch select field update
   - Click priority badge
   - Watch select field update
   
9. (Optional) Submit:
   - Fill any required fields
   - Click "Create Issue"
   - Should go to ticket detail page
   - New ticket created with AI-suggested values
```

---

## Expected Results Summary

| Test Case | Similar Tickets | AI Category | AI Priority | Confidence |
|-----------|-----------------|-------------|-------------|-----------|
| Test 1: Data Access | 2-3 | DATA_ACCURACY | MEDIUM/HIGH | 85%+ |
| Test 2: Feature Request | 0-1 | FEATURE_REQUEST | LOW | 90%+ |
| Test 3: Performance | 2-3 | PERFORMANCE | CRITICAL | 85%+ |
| Test 4: UI Bug | 2-3 | BUG | CRITICAL | 95%+ |
| Test 5: Access Issue | 1-2 | ACCESS_SECURITY | HIGH | 85%+ |

---

## Success Criteria

✅ **For All Tests**:
- [ ] Project selected successfully
- [ ] Title entered without errors
- [ ] Description entered without errors
- [ ] Suggestions appear within 2 seconds
- [ ] Blue badges visible above Category/Priority
- [ ] Badges are clickable and auto-fill fields
- [ ] Hover tooltip shows confidence & reasoning
- [ ] Can submit ticket without errors

✅ **For Semantic Search**:
- [ ] Similar tickets found even with different wording
- [ ] Fallback search works if keyword match is low
- [ ] Suggestions load within 2 seconds

✅ **For AI Suggestions**:
- [ ] Category suggestion is accurate
- [ ] Priority suggestion is appropriate
- [ ] Confidence level displayed (should be 85%+)
- [ ] Reasoning text is helpful

---

## Debugging

If something doesn't work:

```
No suggestions appearing?
→ Check browser console for errors (F12)
→ Verify description is >= 5 characters
→ Wait full 2 seconds for API response

No AI badges?
→ Check console for aiSuggestion errors
→ Verify API response includes aiSuggestion object
→ Check if /api/ticket-suggestions returns data

Badges not clickable?
→ Check if cursor changes to pointer
→ Check browser console for click handler errors
→ Try clicking exactly on the badge text

Suggestions behind other elements?
→ Check z-index (should be z-40)
→ Try scrolling down to see full dropdown
→ Check for CSS overflow hidden
```

---

## Test Priority (Recommended Order)

1. **Start with Test 2** (Feature Request) - Simplest, clearest AI suggestions
2. **Then Test 4** (UI Bug) - Should have multiple matches, obvious category
3. **Then Test 1** (Data Access) - Tests semantic search with synonyms
4. **Then Test 3** (Performance) - Tests urgency/priority classification
5. **Finally Test 5** (Security) - Tests access control classification

This order builds confidence progressively!

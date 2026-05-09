# Semantic Search & AI Suggestions - Test Plan

## Test Scenarios

### Scenario 1: Different Keywords, Same Meaning ✅

**Test Case**: Create ticket about "unable to view account history"

If resolved ticket exists with title like: "Customer cannot see past transactions"
- **Expected**: Semantic search finds the match
- **Why**: Both refer to inability to see historical data
- **Test**: Type this description and look for the similar ticket in dropdown

```
Title: "Unable to view account history"
Description: "I cannot view my account history or transaction logs. 
The history section appears empty even though I have made purchases in the past. 
I need to access my transaction details."

AI Suggestions Expected:
- Category: DATA_ACCURACY or ACCESS_SECURITY
- Priority: MEDIUM to HIGH
```

---

### Scenario 2: Synonym-Based Search ✅

**Test Case**: Create ticket about "dashboard rendering issue"

If resolved ticket exists with title like: "Web portal not displaying correctly"
- **Expected**: Semantic search identifies it as similar
- **Why**: "dashboard/portal" are synonymous, "rendering/displaying" are similar
- **Test**: Verify the resolved ticket appears in suggestions

```
Title: "Dashboard rendering issue"
Description: "The dashboard is not rendering correctly on my screen. 
All the widgets and charts are not loading properly. 
The layout seems broken and elements are overlapping. 
This is blocking my ability to monitor system metrics."

AI Suggestions Expected:
- Category: BUG
- Priority: HIGH
```

---

### Scenario 3: Technical vs Non-Technical Language ✅

**Test Case**: Create ticket using non-technical language

If resolved ticket exists with technical title like: "API rate limiting exceeded"
- **Expected**: Semantic search finds it even with simple language
- **Why**: Semantic search understands intent, not just keywords

```
Title: "Getting errors when using the system too much"
Description: "When I try to use the application multiple times quickly, 
I start getting error messages saying I need to wait. 
It seems like the system has some kind of limit on how often I can use it."

AI Suggestions Expected:
- Category: PERFORMANCE or ACCESS_SECURITY
- Priority: MEDIUM
```

---

### Scenario 4: Complete Keyword Mismatch ✅

**Test Case**: Create ticket with completely different wording

If resolved ticket exists with title: "Email notifications not being received"
- **Expected**: Semantic search still finds it
- **Why**: Both are about communication/alerts, even if wording differs

```
Title: "Not getting notification messages"
Description: "I'm not receiving alerts through my communication channel. 
I should be getting messages when certain events happen, 
but nothing is coming through to my end. 
This is affecting my workflow as I can't stay informed about updates."

AI Suggestions Expected:
- Category: BUG or ACCESS_SECURITY
- Priority: MEDIUM
```

---

### Scenario 5: AI Suggestion Accuracy Test ✅

**Test Case**: Create ticket that clearly matches a category

```
Title: "New feature request: Dark mode support"
Description: "I would like to request a dark mode feature for the application. 
Many users prefer dark mode for better accessibility and reduced eye strain. 
It would be great if this could be added to the next release."

AI Suggestions Expected:
- Category: FEATURE_REQUEST (HIGH CONFIDENCE)
- Priority: LOW to MEDIUM
- Reasoning: "This is a feature request, not a bug or issue"

Test Action:
1. Look at the blue badges above the select fields
2. Badge should show: "🤖 AI Suggested: FEATURE_REQUEST"
3. Hover over badge to see confidence % and reasoning
4. Click badge to auto-fill that field
5. Verify the select field updates to "FEATURE_REQUEST"
```

---

## Step-by-Step Testing Instructions

### Test 1: Semantic Search Works
1. Go to `/create-ticket` page
2. Enter test description from Scenario 1
3. Wait for 500ms debounce
4. **Verify**: "Similar Resolved Tickets" section appears below description
5. **Expected**: At least one similar ticket is found (even with different keywords)

### Test 2: AI Suggestions Display
1. Same as Test 1
2. Scroll down to Category and Priority fields
3. **Verify**: Blue badges appear above both fields (if AI suggestions exist)
4. Badge format: "🤖 AI Suggested: {VALUE}"
5. **Hover over badge**: Tooltip shows confidence % and reasoning

### Test 3: AI Suggestion Click-to-Fill
1. With blue badge visible above Priority field
2. **Click the badge**
3. **Verify**: Priority select field updates with suggested value instantly
4. **Do same for Category badge**

### Test 4: User Can Override
1. After AI suggestions are applied
2. Click on Priority select field
3. Choose a different value
4. **Verify**: Select updates without errors
5. Badge should disappear (suggestion overridden)

### Test 5: Semantic Search Without Keywords
1. Create ticket about something vague/general
2. Use completely different wording than any resolved ticket title
3. Example: "Things not working as expected"
4. **Expected**: Fallback semantic search finds related tickets
5. This tests the "hybrid + fallback" approach

---

## Success Criteria

✅ **Semantic Search**:
- [ ] Similar tickets appear even with different keywords
- [ ] Fallback search works for edge cases
- [ ] No errors in console

✅ **AI Suggestions**:
- [ ] Badges appear for both Category and Priority
- [ ] Badges are clickable and auto-fill fields
- [ ] Hover tooltip shows reasoning
- [ ] Can override suggestions

✅ **Performance**:
- [ ] Suggestions load within 2 seconds
- [ ] Badges render instantly
- [ ] No lag or freezing

✅ **User Experience**:
- [ ] Badges are clearly visible (blue color)
- [ ] Icons (🤖) help identify AI suggestions
- [ ] One-click functionality works smoothly
- [ ] Error messages (if any) are clear

---

## Expected Behavior

### Before Semantic Search (Old System):
```
User types: "Cannot view account history"
Results: None found (no exact keyword match)
AI Suggestions: None
```

### After Semantic Search (New System):
```
User types: "Cannot view account history"
Results: ✅ Similar Resolved Tickets Found:
  - "Customer cannot see past transactions"
  - "Unable to access transaction history"
AI Suggestions: ✅ Displayed
  - Category Badge: "🤖 AI Suggested: DATA_ACCURACY"
  - Priority Badge: "🤖 AI Suggested: HIGH"
```

---

## Debugging Tips

If tests fail:

1. **No suggestions appearing**:
   - Check browser console for errors
   - Verify query length >= 5 characters
   - Check that /api/ticket-suggestions returns data

2. **AI suggestion badges not appearing**:
   - Check that aiSuggestion is not null
   - Look for errors in /api/ticket-suggestions response
   - Verify database has embedding data

3. **Semantic search not finding similar tickets**:
   - Check that resolved tickets have embeddings
   - Verify fallback search is triggered (if < 3 keyword matches)
   - Check embedding dimensions (should be 384)

4. **Performance issues**:
   - Check if embedding generation is blocking (should be non-blocking)
   - Verify cosine similarity calculation is efficient
   - Check Claude API response time

---

## Notes

- All 34 resolved issues have been pre-embedded (backfill completed)
- All 11 published KB articles have been pre-embedded
- New resolved tickets will be automatically embedded (no manual step needed)
- Embeddings are deterministic (same text = same embedding every time)
- AI suggestions use existing classifyIssue function (no extra API calls)

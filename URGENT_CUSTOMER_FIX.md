# URGENT FIX CHECKLIST

## Issue: Only "Verification Agent" showing on Customer page despite 13+ customers in database

## Steps to diagnose RIGHT NOW:

### 1. Hard Refresh the Browser
Press **Ctrl+Shift+R** (or Cmd+Shift+R on Mac) to clear cache

### 2. Open Browser Console
Press **F12** → Go to "Console" tab

### 3. Look for these log messages:
```
🔍 All Supabase customers in Customer Profiles: [...]
🔍 Filtered customers: [...]
```

### 4. Tell me what numbers you see:
- "All Supabase customers" count: ____
- "Filtered customers" count: ____

### 5. Check for errors
Any red error messages in console? Copy and send them.

---

## If you see "All Supabase customers: 1" → Database query is broken
## If you see "All Supabase customers: 13, Filtered: 1" → Filter logic is broken
## If you see "All Supabase customers: 0" → RLS is blocking everything

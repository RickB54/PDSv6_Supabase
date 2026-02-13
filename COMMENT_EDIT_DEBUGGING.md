# 🔍 Comment Edit Troubleshooting Guide

## Issue Reported:

Comment edited successfully (got success notification) but changes don't reflect
when viewing the post.

## Debugging Steps:

### Step 1: Check Browser Console

1. Open the blog in your browser
2. Press `F12` to open Developer Tools
3. Go to the **Console** tab
4. Try editing a comment
5. Look for these log messages:
   - `Updating comment: { commentId: '...', text: '...' }`
   - `Comment updated successfully: [...]`
   - OR any error messages

### Step 2: Verify Database Update

The enhanced `updateComment` function now logs:

- What it's trying to update
- Success confirmation with returned data
- Any errors from Supabase

### Step 3: Test Scenarios

**Scenario A: Edit in BlogReorder, View in PrimeBlog**

1. Go to `/blog-reorder`
2. Click Edit on a post with comments
3. Edit a comment, click Save
4. Close the modal
5. Go to `/blog` (Prime Blog)
6. Click on the same post
7. Check if the edit appears

**Scenario B: Edit in PrimeBlog Viewer**

1. Go to `/blog`
2. Click on a post with comments
3. Scroll to comments section
4. Edit a comment directly
5. Refresh the page
6. Click on the post again
7. Check if the edit appears

### Step 4: Check for Common Issues

**Issue 1: Permission Denied**

- Check console for RLS (Row Level Security) errors
- Verify you're logged in as the comment author or admin

**Issue 2: Wrong Comment ID**

- Check if the commentId being sent is correct
- Verify it matches the comment you're editing

**Issue 3: Text Not Updating**

- Ensure the new text is different from the old text
- Check if empty strings are being sent

**Issue 4: Caching**

- Try hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Clear browser cache
- Open in Incognito/Private window

### Step 5: Check Supabase Directly

1. Go to your Supabase dashboard
2. Navigate to Table Editor
3. Find `learning_library_comments` table
4. Look for the comment you edited
5. Check if the `text` field actually updated
6. Check the `updated_at` timestamp (if it exists)

### Step 6: RLS Policy Check

The `updateComment` function updates the `text` field. Make sure you have the
right RLS policy:

```sql
-- Check if this policy exists in Supabase
-- Go to: Authentication > Policies > learning_library_comments

-- You should have an UPDATE policy like:
CREATE POLICY "Users can update their own comments"
ON learning_library_comments
FOR UPDATE
USING (auth.uid() = user_id OR auth.role() = 'admin');
```

## Expected Console Output (Success):

```
Updating comment: { commentId: 'abc123...', text: 'This is my edited comment' }
Comment updated successfully: [{id: 'abc123...', text: 'This is my edited comment', ...}]
Comment Updated (toast notification)
```

## Expected Console Output (Error):

```
Updating comment: { commentId: 'abc123...', text: 'This is my edited comment' }
Supabase error updating comment: { code: '...', message: '...', details: '...' }
Error updating comment: Error: ...
Update Failed (toast notification)
```

## Quick Fix Checklist:

- [ ] Check browser console for errors
- [ ] Verify you're logged in
- [ ] Confirm you're the comment author or an admin
- [ ] Try hard refresh after editing
- [ ] Check Supabase table directly
- [ ] Verify RLS UPDATE policy exists
- [ ] Try editing a different comment
- [ ] Test in incognito mode

## Next Steps:

After you try editing a comment again:

1. Open browser console (F12)
2. Copy all the console output
3. Share what you see

This will help me identify exactly where the issue is!

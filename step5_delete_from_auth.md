# STEP 5: DELETE PAUL FROM AUTHENTICATION

**DO THIS IN SUPABASE DASHBOARD (NOT SQL EDITOR)**

## Instructions:

1. Open Supabase Dashboard
2. Click **Authentication** in the left sidebar
3. Click **Users**
4. Find the row with email: `pg0124@gmail.com`
5. Click the **three dots (...)** on the right side of Paul's row
6. Click **"Delete user"**
7. Click **"Confirm"** in the popup

## Expected Result:
- Paul should disappear from the Users list
- You should see a success message

## Why This is Important:
- This deletes Paul from the authentication system
- Without this, he can still log in even though he's deleted from app_users
- This ensures a clean slate

---

**After completing this step, move to step6_recreate_paul.md**

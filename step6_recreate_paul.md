# STEP 6: RECREATE PAUL IN THE APP

**DO THIS IN YOUR APPLICATION (NOT SUPABASE)**

## Instructions:

1. **Make sure you're logged in as admin (Rick)**

2. **Go to the Users & Roles page:**
   - Click **Operations** in the sidebar
   - Click **Users & Roles**

3. **Scroll down to "Active Employees" section**

4. **Click "Onboard New Employee"** (the accordion will expand)

5. **Fill in the form:**
   - **Name:** `Paul`
   - **Email:** `pg0124@gmail.com`
   - **Password:** (create a NEW password and write it down!)
     - Example: `Paul2025!Secure`
     - Make sure it's at least 8 characters

6. **Click "Add Employee" button**

7. **Wait for success message:**
   - Should see: "Employee created - Paul (pg0124@gmail.com) added successfully"

## Expected Result:
- Paul should appear in the Employees table
- You should see a success toast notification

## What This Does:
- Creates Paul in auth.users with role='employee'
- Creates Paul in app_users with role='employee'
- Sets up everything correctly via the Edge Function

---

**After completing this step, move to step7_verify_paul.sql**

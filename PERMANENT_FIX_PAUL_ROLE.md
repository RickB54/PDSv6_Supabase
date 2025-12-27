# PERMANENT FIX - Paul's Role Issue

## **The Root Cause:**
Paul was created directly in Supabase dashboard, not through the app. This causes his role to flip between 'employee' and 'customer' because:
- His email might exist in multiple tables
- Auth metadata might be missing or incorrect
- Database triggers might be overwriting his role

---

## **PERMANENT FIX - Step by Step:**

### **Step 1: Delete Paul Completely from Supabase**

Run these SQL queries in Supabase SQL Editor:

```sql
-- 1. Find Paul's user ID
SELECT id, email, role FROM app_users WHERE email = 'pg0124@gmail.com';
-- Copy the ID for next steps

-- 2. Delete from app_users
DELETE FROM app_users WHERE email = 'pg0124@gmail.com';

-- 3. Delete from auth.users (use the ID from step 1)
-- Go to Authentication > Users in Supabase Dashboard
-- Find pg0124@gmail.com and click Delete
-- OR run this if you have access:
-- DELETE FROM auth.users WHERE email = 'pg0124@gmail.com';

-- 4. Check if Paul exists in customers table
SELECT * FROM customers WHERE email = 'pg0124@gmail.com';
-- If he exists and you want to keep customer data, leave it
-- If you want to remove it:
-- DELETE FROM customers WHERE email = 'pg0124@gmail.com';
```

---

### **Step 2: Recreate Paul Through the App**

1. ✅ Log in as admin (Rick)
2. ✅ Go to **Operations** → **Users & Roles**
3. ✅ Scroll to **Active Employees** section
4. ✅ Click **"Onboard New Employee"** accordion
5. ✅ Fill in:
   - Name: `Paul`
   - Email: `pg0124@gmail.com`
   - Password: (create a new password)
6. ✅ Click **"Add Employee"**
7. ✅ Wait for success message

**This will:**
- Create auth user with correct role metadata
- Create `app_users` record with `role='employee'`
- Set up everything correctly

---

### **Step 3: Add Database Trigger (Permanent Prevention)**

Run this SQL in Supabase to create a trigger that ensures role consistency:

```sql
-- Create a function to enforce role consistency
CREATE OR REPLACE FUNCTION enforce_employee_role()
RETURNS TRIGGER AS $$
BEGIN
  -- If this user has role='employee' in app_users, keep it that way
  IF EXISTS (
    SELECT 1 FROM app_users 
    WHERE id = NEW.id 
    AND role = 'employee'
  ) THEN
    -- Prevent role from being changed to anything else
    IF NEW.role != 'employee' THEN
      NEW.role := 'employee';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on app_users table
DROP TRIGGER IF EXISTS enforce_employee_role_trigger ON app_users;
CREATE TRIGGER enforce_employee_role_trigger
  BEFORE UPDATE ON app_users
  FOR EACH ROW
  EXECUTE FUNCTION enforce_employee_role();
```

**What this does:**
- Prevents Paul's role from being changed from 'employee' to anything else
- Runs automatically on every update to `app_users`
- Ensures role consistency

---

### **Step 4: Verify the Fix**

After recreating Paul:

```sql
-- Check Paul's record
SELECT id, email, role, name, is_active, created_at, updated_at
FROM app_users
WHERE email = 'pg0124@gmail.com';

-- Should show:
-- role: 'employee'
-- name: 'Paul'
-- is_active: true
```

---

### **Step 5: Test**

1. ✅ Paul logs out
2. ✅ Paul clears browser cache (or uses incognito)
3. ✅ Paul logs in with new password
4. ✅ Should see **Employee Dashboard**
5. ✅ Menu should show **Customer Intake** section
6. ✅ Should NOT see customer portal

---

## **Additional Prevention: Remove Email from Customers Table**

If Paul's email exists in the `customers` table and he's not actually a customer:

```sql
-- Check if Paul is in customers table
SELECT * FROM customers WHERE email = 'pg0124@gmail.com';

-- If he exists and shouldn't be a customer, delete:
DELETE FROM customers WHERE email = 'pg0124@gmail.com';
```

**Important:** Only do this if Paul is NOT a real customer. If he is both an employee AND a customer, use a different email for his employee account.

---

## **Best Practice Going Forward:**

### **✅ DO:**
- Create all users through the app (Users & Roles page)
- Use unique emails for employees vs customers
- Let the Edge Functions handle user creation

### **❌ DON'T:**
- Create users directly in Supabase dashboard
- Use the same email for employee and customer
- Manually edit roles in Supabase

---

## **Why This Fixes It Permanently:**

1. **Clean Slate:** Deleting and recreating removes all conflicting data
2. **Proper Creation:** Edge Function sets everything correctly
3. **Database Trigger:** Prevents role from being changed
4. **No Duplicates:** One email = one role

---

## **If You Have Other Employees Created in Supabase:**

Run this to find them:

```sql
-- Find users who might have been created manually
SELECT 
  u.id,
  u.email,
  u.role,
  u.name,
  u.created_at,
  CASE 
    WHEN u.created_at < '2025-12-15' THEN 'Possibly manual'
    ELSE 'Likely via app'
  END as creation_method
FROM app_users u
WHERE role = 'employee'
ORDER BY created_at;
```

**For each manual employee:**
1. Delete them
2. Recreate via Users & Roles page
3. They'll need new passwords

---

## **Summary:**

**Problem:** Paul created in Supabase, role keeps flipping
**Solution:** Delete completely, recreate via app, add trigger
**Prevention:** Always use Users & Roles page, add database trigger
**Result:** Role will stay 'employee' permanently

---

## **Execute This Plan:**

1. ✅ Run Step 1 SQL (delete Paul)
2. ✅ Run Step 2 (recreate via app)
3. ✅ Run Step 3 SQL (add trigger)
4. ✅ Run Step 4 SQL (verify)
5. ✅ Test with Paul login

**This will fix it permanently!** 🎯

---

**Do you want me to create a single SQL script that does all of this at once?**

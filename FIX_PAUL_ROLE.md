# Fix Paul's Role - Quick Solution

## **Problem:**
Paul is being shown the customer "My Account" page instead of the Employee Dashboard because Supabase thinks he's a customer.

---

## **Solution: Update Paul's Role in Supabase**

### **Option 1: SQL Query (Fastest)**

Run this in Supabase SQL Editor:

```sql
-- Check Paul's current role
SELECT id, email, role, name 
FROM app_users 
WHERE email = 'pg0124@gmail.com';

-- Update Paul's role to employee
UPDATE app_users 
SET role = 'employee', 
    name = 'Paul'
WHERE email = 'pg0124@gmail.com';

-- Verify the change
SELECT id, email, role, name 
FROM app_users 
WHERE email = 'pg0124@gmail.com';
```

---

### **Option 2: Via Users & Roles Page**

1. Log in as admin (Rick)
2. Go to **Operations** → **Users & Roles**
3. Find Paul in the **Employees** section
4. If he's not there, check the **Customers** section
5. If he's in Customers, you'll need to use Option 1 (SQL)

---

### **Option 3: Delete and Recreate**

If Paul doesn't exist in `app_users`:

```sql
-- Insert Paul as employee
INSERT INTO app_users (email, role, name)
VALUES ('pg0124@gmail.com', 'employee', 'Paul')
ON CONFLICT (email) 
DO UPDATE SET role = 'employee', name = 'Paul';
```

---

## **Why This Happened:**

1. Paul's email exists in the `customers` table
2. When he logs in, the system checks `app_users` table
3. If his role is 'customer' or missing, he gets customer view
4. He needs `role='employee'` in `app_users` table

---

## **After Fixing:**

1. Paul logs out
2. Paul logs in again
3. He should see Employee Dashboard
4. Menu shows employee items (Customer Intake, etc.)

---

## **Permanent Fix:**

The system should check the `app_users` table role first, not the `customers` table. This is already how it should work, but Paul's record might be incorrect.

---

## **Quick Test:**

After running the SQL:
1. Paul logs out
2. Clears browser cache (or use incognito)
3. Logs in again
4. Should see Employee Dashboard

---

**Run the SQL query in Supabase now, then have Paul log out and back in!** 🎯

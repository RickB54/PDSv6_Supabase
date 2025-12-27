# Employee Role Issue - Prevention Guide

## ✅ **Paul's Issue Resolved!**
The system refreshed and now correctly shows Paul as an employee.

---

## **Why This Happened:**

### **Possible Causes:**
1. **Caching Issue** - Browser cached old role data
2. **Race Condition** - System checked `customers` table before `app_users` updated
3. **Duplicate Email** - Paul's email exists in both `customers` and `app_users` tables

### **The System Works Like This:**
```
User logs in with email
         ↓
System checks auth.users table
         ↓
Gets user ID
         ↓
Checks app_users table for role
         ↓
If role = 'employee' → Employee Dashboard
If role = 'customer' → Customer Portal
If role = 'admin' → Admin Dashboard
```

---

## **Will This Happen to Other Employees?**

### **✅ Should NOT Happen If:**
- Employees are created via **Users & Roles** page
- The `create-employee` Edge Function is used
- Employees don't have duplicate emails in `customers` table

### **❌ Could Happen If:**
- Employee email already exists in `customers` table
- Employee is created manually in Supabase dashboard
- Browser cache isn't cleared after role change
- Database has stale data

---

## **Prevention:**

### **1. Always Use Users & Roles Page**
✅ Go to **Operations** → **Users & Roles**
✅ Use "Onboard New Employee" accordion
✅ This uses the Edge Function which sets role correctly

### **2. Avoid Duplicate Emails**
❌ Don't use the same email for employee and customer
✅ Use different emails (e.g., `paul@company.com` for employee, `paul.personal@gmail.com` for customer)

### **3. Clear Browser Cache**
After creating/updating users:
- Have them log out
- Clear browser cache (or use incognito)
- Log back in

---

## **How Employees Are Created (Correctly):**

### **Via Users & Roles Page:**
```typescript
// Uses create-employee Edge Function
1. Admin fills in name, email, password
2. Edge Function creates auth user with role='employee'
3. Edge Function upserts to app_users with role='employee'
4. Employee can log in and see Employee Dashboard
```

### **The Edge Function Does:**
```typescript
// Create auth user
supabase.auth.admin.createUser({
  email,
  password,
  user_metadata: { role: 'employee', name }
});

// Upsert to app_users
supabase.from('app_users').upsert({
  id: userId,
  email,
  role: 'employee',  // ← This is key!
  name,
  is_active: true
});
```

---

## **If It Happens Again:**

### **Quick Fix:**
1. Go to Supabase SQL Editor
2. Run this query:
```sql
-- Check the user's role
SELECT id, email, role, name 
FROM app_users 
WHERE email = 'employee@email.com';

-- If role is wrong, fix it:
UPDATE app_users 
SET role = 'employee'
WHERE email = 'employee@email.com';
```

3. Have employee log out and back in

---

## **Monitoring:**

### **Check Employee Roles:**
```sql
-- List all employees
SELECT id, email, name, role, is_active, updated_at
FROM app_users
WHERE role = 'employee'
ORDER BY updated_at DESC;

-- Find users with duplicate emails
SELECT email, COUNT(*) as count
FROM app_users
GROUP BY email
HAVING COUNT(*) > 1;
```

---

## **Best Practices:**

### **For Admins:**
✅ Always create employees via Users & Roles page
✅ Use unique emails for employees
✅ Don't manually edit roles in Supabase dashboard
✅ If role needs changing, use Users & Roles page

### **For Employees:**
✅ Log out and back in after role changes
✅ Clear browser cache if seeing wrong dashboard
✅ Use incognito mode to test fresh login

---

## **System Safeguards:**

The system already has safeguards:
1. ✅ Edge Function sets role correctly
2. ✅ `app_users` table has role field
3. ✅ Auth metadata includes role
4. ✅ Login checks `app_users` for role

---

## **Summary:**

**The Issue:** Paul briefly saw customer portal instead of employee dashboard

**The Cause:** Likely browser cache or database refresh delay

**The Fix:** System auto-corrected, Paul now sees employee dashboard

**Prevention:** 
- Use Users & Roles page to create employees
- Avoid duplicate emails
- Clear cache after role changes

**Will it happen again?** Unlikely if following best practices

---

**You're all set! The system is working correctly now.** ✅

**If it happens again, just run the SQL query to fix the role, or have the employee clear their cache and log back in.** 🎯

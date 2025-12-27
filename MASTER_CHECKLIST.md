# MASTER CHECKLIST - Fix Paul's Role Permanently

## ✅ Complete These Steps IN ORDER

### **SQL Steps (Run in Supabase SQL Editor):**

- [ ] **Step 1:** Run `step1_delete_paul.sql`
  - Deletes Paul from app_users table
  - Expected: "Success. No rows returned" or "DELETE 1"

- [ ] **Step 2:** Run `step2_verify_deleted.sql`
  - Verifies Paul is gone
  - Expected: "No rows" (empty table)

- [ ] **Step 3:** Run `step3_create_trigger.sql`
  - Creates role enforcement trigger
  - Expected: "Success. No rows returned"

- [ ] **Step 4:** Run `step4_verify_trigger.sql`
  - Verifies trigger was created
  - Expected: One row showing trigger details

---

### **Manual Steps (Do in Supabase Dashboard):**

- [ ] **Step 5:** Follow `step5_delete_from_auth.md`
  - Delete Paul from Authentication > Users
  - Expected: Paul disappears from users list

---

### **App Steps (Do in Your Application):**

- [ ] **Step 6:** Follow `step6_recreate_paul.md`
  - Recreate Paul via Operations > Users & Roles
  - Expected: Success message, Paul appears in Employees table

---

### **Verification Steps:**

- [ ] **Step 7:** Run `step7_verify_paul.sql`
  - Verify Paul was created correctly
  - Expected: One row with role='employee'

- [ ] **Step 8:** Follow `step8_test_login.md`
  - Test Paul's login
  - Expected: Employee Dashboard (NOT customer portal)

---

## 📁 Files Created:

1. `step1_delete_paul.sql` - SQL to delete Paul
2. `step2_verify_deleted.sql` - SQL to verify deletion
3. `step3_create_trigger.sql` - SQL to create trigger
4. `step4_verify_trigger.sql` - SQL to verify trigger
5. `step5_delete_from_auth.md` - Instructions for auth deletion
6. `step6_recreate_paul.md` - Instructions to recreate Paul
7. `step7_verify_paul.sql` - SQL to verify Paul
8. `step8_test_login.md` - Instructions to test login

---

## 🎯 What This Fixes:

**Problem:** Paul's role keeps flipping from employee to customer

**Solution:** 
1. Complete deletion of Paul
2. Database trigger to prevent role changes
3. Proper recreation via app (not Supabase)

**Result:** Paul's role will NEVER flip to customer again!

---

## ⏱️ Time Required:

- SQL steps: ~5 minutes
- Manual steps: ~5 minutes
- Testing: ~2 minutes
- **Total: ~12 minutes**

---

## 🚨 Important Notes:

1. **Do steps IN ORDER** - Don't skip any!
2. **Write down the new password** you create in step 6
3. **Verify each step** before moving to the next
4. **Test thoroughly** in step 8

---

## ✅ Success Criteria:

- [ ] Paul can log in
- [ ] Paul sees Employee Dashboard
- [ ] Paul sees Customer Intake menu
- [ ] Paul does NOT see customer portal
- [ ] After logging out and back in, still sees Employee Dashboard

---

**Start with step1_delete_paul.sql and work your way through!**

**Good luck! You've got this!** 🎯

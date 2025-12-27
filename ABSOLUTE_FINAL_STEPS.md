# FINAL SIMPLE STEPS - NO MORE SQL ERRORS!

## **You MUST do this in Supabase Dashboard - there's no SQL way**

---

## **STEP 1: Create Paul in Dashboard (2 minutes)**

### **Open Supabase Dashboard:**
1. Go to: https://supabase.com/dashboard
2. Click your project
3. Click **"Authentication"** in left sidebar (🔐 icon)
4. Click **"Users"** tab at the top
5. Click **"Add user"** button (green, top right)

### **Fill in the form:**
- **Email:** `pg0124@gmail.com`
- **Password:** (use Paul's real password)
- **Auto Confirm User:** ✅ **CHECK THIS BOX!**

### **Click "Create user"**

**Done with Step 1!** ✅

---

## **STEP 2: Run This SQL (30 seconds)**

Copy and paste this into Supabase SQL Editor:

```sql
-- Add Paul to app_users with role='employee'
INSERT INTO app_users (id, email, role, name, created_at, updated_at)
SELECT 
  id,
  'pg0124@gmail.com',
  'employee',
  'Paul',
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'pg0124@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'employee',
  name = 'Paul',
  updated_at = NOW();

-- Verify it worked
SELECT id, email, role, name FROM app_users WHERE email = 'pg0124@gmail.com';
```

**Expected:** One row with role='employee'

---

## **STEP 3: Test Login (1 minute)**

1. Log out as admin
2. Log in as Paul
3. Should see Employee Dashboard ✅

---

## **THAT'S IT!**

**Total time: 3-4 minutes**

**No more SQL errors - just click, paste, done!** 🎯

---

**Start with Step 1 in Supabase Dashboard now!**

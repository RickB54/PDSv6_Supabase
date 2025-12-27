# STEP 6 ALTERNATIVE: CREATE PAUL IN SUPABASE DASHBOARD

**Since the Edge Function isn't working, we'll create Paul directly in Supabase**

---

## **Method 1: Create User in Supabase Dashboard (EASIEST)**

### **Part A: Create Auth User**

1. **Go to Supabase Dashboard**
2. **Click "Authentication"** in left sidebar
3. **Click "Users" tab**
4. **Click "Add user"** button (top right, green button)
5. **Fill in the form:**
   - **Email:** `pg0124@gmail.com`
   - **Password:** (create a password, write it down!)
     - Example: `Paul2025!Secure`
   - **Auto Confirm User:** ✅ CHECK THIS BOX
6. **Click "Create user"**

**Expected:** Paul appears in the users list

---

### **Part B: Add Paul to app_users Table**

1. **Stay in Supabase Dashboard**
2. **Click "Table Editor"** in left sidebar
3. **Click "app_users" table** (in the list of tables)
4. **Click "Insert" button** (top right) → **"Insert row"**
5. **Fill in the form:**
   - **id:** (copy Paul's ID from Authentication > Users)
     - Go back to Authentication > Users
     - Find Paul's row
     - Copy his UUID (long string like: 2b22f64a-2630-493b-ba90-914bf...)
     - Paste it here
   - **email:** `pg0124@gmail.com`
   - **role:** `employee` ← VERY IMPORTANT!
   - **name:** `Paul`
   - **created_at:** (leave as is or click "now")
   - **updated_at:** (leave as is or click "now")
6. **Click "Save"**

**Expected:** Paul appears in app_users table with role='employee'

---

## **Method 2: Use SQL (FASTER)**

### **Run this in SQL Editor:**

```sql
-- First, get Paul's ID from auth.users
SELECT id, email FROM auth.users WHERE email = 'pg0124@gmail.com';

-- Copy the ID from the result, then run this:
-- Replace 'PAUL_ID_HERE' with the actual ID you copied
INSERT INTO app_users (id, email, role, name, created_at, updated_at)
VALUES (
  'PAUL_ID_HERE',  -- Paste Paul's ID here (keep the quotes)
  'pg0124@gmail.com',
  'employee',
  'Paul',
  NOW(),
  NOW()
);

-- Verify it worked
SELECT id, email, role, name FROM app_users WHERE email = 'pg0124@gmail.com';
```

---

## **Method 3: Simplest SQL (Let it generate ID)**

If you already created Paul in Authentication > Users, just run this:

```sql
-- Get Paul's auth ID
DO $$
DECLARE
  paul_auth_id UUID;
BEGIN
  -- Get Paul's ID from auth.users
  SELECT id INTO paul_auth_id FROM auth.users WHERE email = 'pg0124@gmail.com';
  
  -- Insert into app_users
  INSERT INTO app_users (id, email, role, name, created_at, updated_at)
  VALUES (
    paul_auth_id,
    'pg0124@gmail.com',
    'employee',
    'Paul',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'employee',
    name = 'Paul',
    updated_at = NOW();
END $$;

-- Verify
SELECT id, email, role, name FROM app_users WHERE email = 'pg0124@gmail.com';
```

---

## **After Creating Paul:**

1. **Verify in SQL Editor:**
```sql
SELECT id, email, role, name FROM app_users WHERE email = 'pg0124@gmail.com';
```

**Should show:** role = 'employee'

2. **Move to step 8** - Test Paul's login

---

## **Why the Edge Function Failed:**

The error "Failed to send a request to the Edge Function" means:
- The `create-employee` Edge Function might not be deployed
- Or there's a network issue
- Or the function has an error

**For now, creating Paul directly in Supabase works just as well!**

---

**Use Method 1 (Dashboard UI) if you prefer clicking, or Method 3 (SQL) if you prefer code!**

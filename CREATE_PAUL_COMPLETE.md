# CREATE PAUL - COMPLETE STEPS

## **You need to create Paul in TWO places:**
1. Authentication (auth.users) - for login
2. app_users table - for role

---

## **STEP 1: Create Paul in Authentication**

### **Go to Supabase Dashboard:**

1. Click **"Authentication"** in left sidebar
2. Click **"Users"** tab
3. Click **"Add user"** button (green button, top right)
4. Fill in the form:
   - **Email:** `pg0124@gmail.com`
   - **Password:** `Paul2025!Secure` (or create your own, write it down!)
   - **Auto Confirm User:** ✅ **CHECK THIS BOX** (very important!)
5. Click **"Create user"**

**Expected:** Paul appears in the users list with email pg0124@gmail.com

---

## **STEP 2: Add Paul to app_users**

### **Now run this SQL in SQL Editor:**

```sql
-- Get Paul's ID and add him to app_users
DO $$
DECLARE
  paul_id UUID;
BEGIN
  -- Get Paul's ID from auth.users
  SELECT id INTO paul_id FROM auth.users WHERE email = 'pg0124@gmail.com';
  
  -- If Paul doesn't exist, show error
  IF paul_id IS NULL THEN
    RAISE EXCEPTION 'Paul not found! Go create him in Authentication > Users first!';
  END IF;
  
  -- Insert Paul into app_users with role='employee'
  INSERT INTO app_users (id, email, role, name, created_at, updated_at)
  VALUES (
    paul_id,
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
  
  RAISE NOTICE 'SUCCESS! Paul created with role=employee';
END $$;

-- Verify Paul was created
SELECT id, email, role, name 
FROM app_users 
WHERE email = 'pg0124@gmail.com';
```

**Expected:** One row showing Paul with role='employee'

---

## **STEP 3: Test Paul's Login**

1. Log out as admin
2. Log in as Paul:
   - Email: `pg0124@gmail.com`
   - Password: (the password you created in step 1)
3. Should see: **Employee Dashboard** ✅

---

## **Quick Checklist:**

- [ ] Created Paul in Authentication > Users
- [ ] Checked "Auto Confirm User"
- [ ] Wrote down the password
- [ ] Ran the SQL script above
- [ ] Saw "SUCCESS!" message
- [ ] Verified Paul has role='employee'
- [ ] Tested Paul's login
- [ ] Paul sees Employee Dashboard

---

**Start with STEP 1 - create Paul in Authentication > Users!**

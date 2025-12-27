# STEP 5: DELETE PAUL FROM AUTHENTICATION - DETAILED GUIDE

## **Where to Find This in Supabase Dashboard**

### **Step-by-Step with Exact Locations:**

---

### **1. Open Supabase Dashboard**
- Go to: https://supabase.com/dashboard
- Or: https://app.supabase.com
- Log in if needed

---

### **2. Select Your Project**
- You should see your project listed
- Click on your project name to open it

---

### **3. Find Authentication in Left Sidebar**
Look at the **LEFT SIDEBAR** (the menu on the left side of the screen)

You should see these menu items:
- 🏠 Home
- 📊 Table Editor
- 🔐 **Authentication** ← CLICK THIS ONE!
- 📁 Storage
- 🔧 SQL Editor
- etc.

**Click on "Authentication"** (it has a lock icon 🔐)

---

### **4. Click "Users" Tab**
After clicking Authentication, you'll see several tabs at the top:
- **Users** ← CLICK THIS ONE!
- Policies
- Providers
- Email Templates
- etc.

**Click on "Users"**

---

### **5. Find Paul in the Users List**
You should now see a table with all users.

Look for a row with:
- **Email:** `pg0124@gmail.com`
- **Name:** Paul (or might be blank)

---

### **6. Delete Paul**
On the **RIGHT SIDE** of Paul's row, you should see:
- Three vertical dots (**⋮**) or
- A menu icon or
- Action buttons

**Click the three dots (⋮)** on Paul's row

A dropdown menu will appear with options like:
- View user
- Send magic link
- Send password recovery
- **Delete user** ← CLICK THIS ONE!

**Click "Delete user"**

---

### **7. Confirm Deletion**
A popup will appear asking you to confirm.

**Click "Confirm"** or **"Delete"** or **"Yes, delete"**

---

### **8. Verify Paul is Gone**
After deletion:
- Paul's row should disappear from the users list
- You should see a success message (green notification)

---

## **What If You Don't See the Delete Option?**

### **Alternative Method - Use SQL:**

If you can't find the delete option in the UI, you can delete from auth using SQL:

1. Go to **SQL Editor** in the left sidebar
2. Run this query:

```sql
-- This requires service role key access
-- If this doesn't work, you MUST use the dashboard UI method above
SELECT id, email FROM auth.users WHERE email = 'pg0124@gmail.com';
```

**Note:** Deleting from `auth.users` table directly via SQL might not work due to permissions. The dashboard UI method is the safest and easiest way.

---

## **Visual Guide:**

```
Supabase Dashboard
├── Left Sidebar
│   ├── Home
│   ├── Table Editor
│   ├── 🔐 Authentication ← CLICK HERE
│   │   ├── Users ← THEN CLICK HERE
│   │   ├── Policies
│   │   └── Providers
│   ├── Storage
│   └── SQL Editor
│
└── Users Table (after clicking Authentication > Users)
    ├── Email Column
    ├── Name Column
    └── Actions Column (⋮) ← CLICK THE DOTS FOR PAUL'S ROW
        └── Delete user ← CLICK THIS
```

---

## **Still Can't Find It?**

### **Skip This Step For Now:**

If you absolutely cannot find the delete option:

1. **Skip to Step 6** - Recreate Paul in the app
2. The app might automatically update the auth user
3. If Paul's role still flips, come back and try this step again

**OR**

Contact me and I'll help you find the exact location in your Supabase dashboard.

---

## **After Deleting Paul:**

✅ Paul should be gone from the Users list
✅ You should see a success message
✅ Move to **step6_recreate_paul.md**

---

**Need help? Let me know which part you're stuck on!**

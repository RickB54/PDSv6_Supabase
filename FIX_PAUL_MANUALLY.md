# FIX PAUL'S ROLE - MANUAL METHOD IN SUPABASE DASHBOARD

## **SQL ISN'T WORKING - USE THE TABLE EDITOR INSTEAD**

---

## **STEP 1: Open Table Editor**

1. Go to Supabase Dashboard
2. Click **"Table Editor"** in left sidebar
3. Click **"app_users"** table in the list

---

## **STEP 2: Find Paul's Row**

1. Look for the row with email: `pg0124@gmail.com`
2. You should see:
   - email: pg0124@gmail.com
   - name: pgd124
   - role: **customer** ← This is wrong!

---

## **STEP 3: Edit Paul's Row**

1. **Click on Paul's row** (anywhere in the row)
2. Find the **"role"** column
3. **Click on the "customer" value**
4. **Change it to:** `employee`
5. Find the **"name"** column
6. **Click on "pgd124"**
7. **Change it to:** `Paul`
8. **Click "Save"** or press Enter

---

## **STEP 4: Verify**

1. Paul's row should now show:
   - role: **employee** ✅
   - name: **Paul** ✅

2. Go back to your app
3. Go to Users & Roles page
4. Click "Refresh All Users"
5. Paul should appear in Employees section! ✅

---

## **WHY SQL ISN'T WORKING:**

There might be:
- RLS (Row Level Security) policies blocking updates
- A different trigger we don't know about
- Permissions issue

**The Table Editor bypasses all of this and lets you edit directly!**

---

**DO THIS NOW - IT WILL WORK!** 🎯

# Prospect Cleanup Guide - Forrest Thompson & Serge Michaud

## Current Situation

You have duplicate records for Forrest Thompson and want to:
1. Identify which is the real prospect
2. Safely delete duplicates
3. Keep Serge Michaud (real prospect)

---

## How to Check Your Records

### Step 1: View All Records in Users & Roles

1. Go to **Users & Roles** page (now in Operations menu)
2. Scroll to the **Customers** section
3. Look for Forrest Thompson entries
4. Check the **Type** column (🟠 Prospect or 🟣 Customer)
5. Check the **Registered** date (newest = most recent)

---

## What to Look For

### Forrest Thompson Records:

Check these details for each entry:
- **Type**: Prospect or Customer?
- **Registered Date**: When was it created?
- **Email**: What email is listed?
- **Phone**: What phone is listed?

**The LATEST one (most recent date) is probably the one you want to keep.**

---

## Safe Deletion Procedure

### ✅ SAFE Way to Delete Prospects:

1. **Check for Vehicles First**
   - If the prospect has vehicles linked, you'll get an error
   - The app will tell you: "This customer has X vehicle(s) linked"
   - Delete or reassign vehicles first

2. **Use the App (Users & Roles)**
   - Click the 🗑️ delete button
   - Confirm the deletion
   - The app checks for safety automatically

3. **What Gets Deleted:**
   - ✅ The customer/prospect record
   - ❌ NOT their vehicles (protected by foreign key)
   - ❌ NOT their bookings (if any)
   - ❌ NOT their invoices (if any)

---

## Step-by-Step: Delete Forrest Thompson Duplicates

### Step 1: Identify the Records

In Users & Roles, you should see something like:

```
Name              | Email           | Type      | Registered  | Actions
Forrest Thompson  | test1@email.com | Prospect  | 12/20/2025  | [✏️] [🗑️]
Forrest Thompson  | test2@email.com | Prospect  | 12/22/2025  | [✏️] [🗑️]
Forrest Thompson  | real@email.com  | Prospect  | 12/26/2025  | [✏️] [🗑️] ← KEEP THIS ONE
```

### Step 2: Decide Which to Keep

**Keep the one that:**
- ✅ Has the most recent date (newest)
- ✅ Has the correct email (if you know it)
- ✅ Is marked as "Prospect" (🟠 orange badge)

**Delete the others that:**
- ❌ Are older
- ❌ Have test/bogus data
- ❌ Are duplicates

### Step 3: Delete the Duplicates

For each duplicate:
1. Click the 🗑️ button
2. Confirm "Are you sure?"
3. If it has vehicles → You'll get an error (good safety check!)
4. If no vehicles → It deletes successfully

---

## What Happens When You Delete

### If Prospect Has NO Vehicles:
```
✅ Prospect deleted successfully
✅ Record removed from database
✅ No other data affected
```

### If Prospect HAS Vehicles:
```
❌ Cannot delete customer
   This customer has 2 vehicle(s) linked.
   Please delete or reassign their vehicles first.
```

**This is GOOD** - it prevents you from accidentally deleting important data!

---

## Forrest Thompson - Recommended Action

Since you mentioned:
- He may have been a test in early stages
- You may have made him a customer to test
- You want to delete him and recreate properly

### Recommended Steps:

1. **Check all 3 Forrest Thompson records**
   - Note their Type (Prospect vs Customer)
   - Note their Registered dates
   - Note if they have any vehicles

2. **Delete ALL of them**
   - Start with the oldest
   - Work your way to the newest
   - If any have vehicles, delete vehicles first

3. **Recreate Fresh on Monday**
   - After you see him at pool league
   - Get his real email and phone
   - Create ONE new prospect with correct data

---

## Serge Michaud - Recommended Action

Since he's a REAL prospect you want to keep:

### Do This:

1. **Find Serge Michaud in Users & Roles**
2. **Check his Type badge** (should be 🟠 Prospect)
3. **Leave him alone for now**
4. **Update on Monday:**
   - Click the ✏️ edit button
   - Update with real email
   - Update with real phone
   - Save changes

---

## Alternative: Use Supabase Dashboard

If you want to see ALL the details before deleting:

### View in Supabase:

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Go to **Table Editor**
4. Select **customers** table
5. Search for "Forrest Thompson"
6. You'll see all records with:
   - `id` (unique identifier)
   - `full_name`
   - `email`
   - `phone`
   - `type` (customer or prospect)
   - `created_at` (when it was created)

**The one with the LATEST `created_at` is the newest.**

---

## Quick Reference: Delete Checklist

Before deleting a prospect, check:

- [ ] Is this the right person to delete?
- [ ] Do they have any vehicles? (app will tell you)
- [ ] Do they have any bookings? (won't prevent deletion but good to know)
- [ ] Is this a duplicate or test record?
- [ ] Am I keeping the correct one?

---

## Summary

### Forrest Thompson (3 duplicates):
✅ **Safe to delete all 3**
✅ **Recreate fresh on Monday with real data**
✅ **Use the app's delete button (🗑️)**
✅ **App will prevent deletion if vehicles exist**

### Serge Michaud (real prospect):
✅ **Keep him**
✅ **Update his details on Monday**
✅ **Use the edit button (✏️) to update**

---

## Need Help Identifying Which to Delete?

If you want me to check the database directly and tell you which Forrest Thompson records exist and which to delete, I can do that! Just let me know and I'll:

1. Query the database
2. Show you all the details
3. Recommend which ones to delete
4. Explain why

---

**You're safe to delete prospects through the app - it has built-in safety checks!** 🛡️

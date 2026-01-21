# 📸 HOW TO ADD PHOTOS/VIDEOS TO THE VEHICLE GALLERY

## Current Workflow (How it works now):

### 1. **Upload Media Through Customer/Prospect Profiles**
   - Go to **"Customers"** or **"Prospects"** page
   - Click on a customer/prospect card OR click "+ New Customer/Prospect"
   - In the modal that opens, scroll down to the **vehicle section**
   - You'll see upload fields for:
     - **General Photos**
     - **Before Photos**
     - **After Photos**
     - **Video URLs** (YouTube/Vimeo links)

### 2. **View Media in Vehicle Gallery**
   - After uploading media to a customer's vehicle
   - Go to **"Vehicle Media Gallery"** page
   - Toggle between **"List View"** (grouped by customer) and **"Gallery View"** (all media in one grid)
   - All uploaded photos and videos will appear here

---

## 🚨 CURRENT PROBLEM:

**The Customer/Prospect pages are currently empty** because of a filtering issue.

### Quick Fix Options:

#### **Option A: Add a test customer manually**
1. Go to Customers page
2. Click "+ New Customer"
3. Fill in:
   - Name: "Test Customer"
   - Type: Select "customer" from dropdown (must be lowercase)
   - Add vehicle info
   - Upload some photos
4. Save

#### **Option B: Fix the filtering** (Requires your help)
Run this SQL in Supabase to check what customer types exist:

```sql
SELECT type, COUNT(*) FROM customers GROUP BY type;
```

Then tell me the results - I'll fix the code to match your actual data.

---

## 💡 FEATURE REQUEST:

**Would you like me to add a direct "Upload Media" button on the Vehicle Gallery page?**

This would let you:
- Upload photos directly from the gallery
- Select which customer/vehicle to attach them to
- Skip the modal workflow

Let me know if you want this enhancement!

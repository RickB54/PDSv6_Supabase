# 📧 EMAIL SETUP COMPLETE - DEPLOYMENT NEEDED

## ✅ What I Just Did:

1. ✅ Added Resend API key to `.env` file
2. ✅ Created Supabase Edge Function (`send-booking-email`)
3. ✅ Updated `BookNow.tsx` to send REAL emails

---

## 🚀 NEXT STEP: Deploy the Edge Function

You need to deploy the email function to Supabase so it can send emails from the cloud.

### Option 1: Deploy via Supabase CLI (Recommended)

**Step 1: Install Supabase CLI** (if not installed)
```powershell
npm install -g supabase
```

**Step 2: Login to Supabase**
```powershell
supabase login
```

**Step 3: Link Your Project**
```powershell
cd c:\Users\rberu\PDSv6_Supabase
supabase link --project-ref kqhaoyaermsqrilhsfxj
```

**Step 4: Deploy the Function**
```powershell
supabase functions deploy send-booking-email --no-verify-jwt
```

**Step 5: Set the Secret (API Key)**
```powershell
supabase secrets set RESEND_API_KEY=re_geNM85no_LGqTrpDnEYg8GNi7ZnWt7uZe
```

---

### Option 2: Deploy via Supabase Dashboard (Easier but longer)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Edge Functions** in sidebar
4. Click **"New Function"**
5. Name it: `send-booking-email`
6. Copy the code from: `supabase/functions/send-booking-email/index.ts`
7. Paste it and click **Deploy**
8. Go to **Settings** → **Vault**
9. Add secret: `RESEND_API_KEY` = `re_geNM85no_LGqTrpDnEYg8GNi7ZnWt7uZe`

---

## 🧪 After Deployment - TEST IT:

1. Submit a test booking on your website
2. Check your Gmail inbox: **Rick.PrimeAutoDetail@gmail.com**
3. You should receive a beautiful HTML email with:
   - Customer name
   - Service details
   - Date & time
   - Price
   - Status (TENTATIVE)

---

## 📝 What Emails Will Look Like:

**Subject:** 🚗 New Booking: John Doe - Prime Essential Interior

**Body:**
```
🚗 New Booking Confirmed!

Customer: John Doe

📅 Date: Tuesday, February 3, 2026
⏰ Time: 03:00 PM
🔧 Service: prime-essential-interior
💰 Total: $180.00

Status: TENTATIVE

Log in to your admin dashboard to confirm or manage this booking.
```

---

**Which deployment method do you want to use?**

1. **CLI** (faster, 5 mins)
2. **Dashboard** (easier, 10 mins)

Let me know and I'll guide you through it!

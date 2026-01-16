# QUICK TEST GUIDE - Online Booking System

## ⚡ FAST TEST (2 Minutes)

### 1. Open Browser Console
- Press **F12** → Go to **Console** tab
- Keep it open!

### 2. Submit a Test Booking
Go to: **http://localhost:6066/book**

Fill in:
- **Name**: Test Customer
- **Email**: test@example.com  
- **Phone**: 555-1234
- **Make**: Honda
- **Model**: Civic
- **Year**: 2020
- **Date**: Click calendar, pick tomorrow
- **Package**: Select "Exterior Detail" (or any)

Click **"Book Now"**

### 3. Check Console (MUST SEE THESE 3 LINES):
```
[LOCAL EMAIL SIMULATOR] Sending to /api/email/admin: {...}
[LOCAL EMAIL SIMULATOR] Sending to /api/email/customer: {...}
[LOCAL SMS SIMULATOR] Sending to 978-566-1008: 🚗 NEW BOOKING ALERT!...
```

### 4. Check Bell Notification
Navigate to: **http://localhost:6066/dashboard/admin**

**MUST SEE:**
- Bell icon is **YELLOW**
- Red badge shows **"1"**
- Click bell → Alert says "Web Booking: Test Customer —..."

### 5. Check Bookings Page
Go to: **http://localhost:6066/bookings**

**MUST SEE:**
- Your test booking in the calendar
- Status badge: **"tentative"** (yellow)

### 6. Check File Manager
Go to: **http://localhost:6066/file-manager**

**MUST SEE:**
- New PDF at top of list
- Filename contains "Test_Customer"
- Click "View" to see the booking PDF

---

## ❌ IF NOTHING WORKS

### Check for Errors in Console:
1. Press F12 → Console tab
2. Look for RED error messages
3. Take a screenshot and send it to me

### Common Issues:
- **"Cannot read property 'add'"** → Store not connected (refresh page)
- **"Network Error"** → Dev server crashed (restart `npm run dev`)
- **"Validation Error"** → Missing required fields (fill all fields)
- **No console logs** → Form didn't submit (check for JS errors)

### Quick Fix:
1. Stop dev server (Ctrl+C in terminal)
2. Run: `npm run dev`
3. Hard refresh browser (Ctrl+Shift+R)
4. Try again

---

## ✅ SUCCESS CHECKLIST

After submitting a booking, you should have:
- [  ] Redirected to Thank You page  
- [  ] 3 console log messages (2 email + 1 SMS)
- [  ] Yellow bell icon with red "1" badge
- [  ] Booking in `/bookings` calendar
- [  ] PDF in `/file-manager`
- [  ] Alert in bell dropdown

**If ALL 6 are checked = SYSTEM WORKING! 🎉**

---

Last Updated: Jan 16, 2026 - 13:55 EST

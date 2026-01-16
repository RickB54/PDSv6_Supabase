# Online Booking System - Complete Verification Guide

## What Happens When a Customer Books Online

When a customer submits a booking from your website (`/book` page), the following processes execute in sequence:

### 1. **Database Persistence** ✅
- **Location**: `BookNow.tsx` → Line 649-663
- **Action**: Calls `addBooking()` to save the booking to Zustand store
- **What gets saved**:
  - Customer name, email, phone
  - Vehicle details (make, model, year, type)
  - Service package selected
  - Selected date/time
  - Total price (after discounts)
  - Status: "tentative" (awaiting admin confirmation)
  - Booked by: "Customer Web"

---

### 2. **PDF Generation & File Manager Archive** 📄
- **Location**: `store/bookings.ts` → Line 118-122
- **Action**: Calls `onBookingCreated()` which:
  - Generates a professional PDF using jsPDF
  - Saves PDF to File Manager under "Bookings YYYY/Month/" folder
  - Creates a timestamped filename
- **How to verify**:
  1. Navigate to `/file-manager` (admin only)
  2. Look for newest PDF at top of list
  3. Category should be "Bookings"
  4. Customer name should match

---

### 3. **Bell Notification** 🔔
- **Location**: `BookNow.tsx` → Line 666
- **Action**: Calls `notify()` to push admin alert
- **Visual indicators**:
  - Bell icon turns **bright yellow**
  - Red badge appears with count
  - Clicking bell shows alert: "Web Booking: [Customer Name] — [Service]"
- **How to verify**:
  1. Look at top-right corner of admin navbar
  2. Bell should be yellow with red badge showing "1"
  3. Click bell to see dropdown with booking alert

---

### 4. **Email Notifications** 📧
- **Location**: `BookNow.tsx` → Line 679-681
- **Recipients**:
  - **Admin**: Receives booking summary with PDF attachment
  - **Customer**: Receives confirmation email at their provided email
- **Current Status**: **LOCAL SIMULATION**
  - Emails are logged to browser console
  - Stored in localStorage under "email-log"
  - **To enable REAL email delivery**, you need to:
    - Add Resend API key to `.env`
    - Or configure Supabase Edge Function for email

**Console Log Example**:
```
[LOCAL EMAIL SIMULATOR] Sending to /api/email/admin: {...}
[LOCAL EMAIL SIMULATOR] Sending to /api/email/customer: {...}
```

---

### 5. **SMS Text Message** 📱
- **Location**: `BookNow.tsx` → Line 682-690
- **Recipient**: Your work phone: **978-566-1008**
- **Message Format**:
  ```
  🚗 NEW BOOKING ALERT!
  
  Customer: [Name]
  Service: [Package]
  Total: $[Amount]
  Date: [MM/DD/YYYY HH:MM AM/PM]
  
  - Prime Auto Detail
  ```
- **Current Status**: **LOCAL SIMULATION**
  - SMS is logged to browser console
  - Stored in localStorage under "sms-log"
  - **To enable REAL SMS delivery**, you need to:
    - Add Twilio credentials to `.env`
    - Or use another SMS service (e.g., Vonage, Plivo)

**Console Log Example**:
```
[LOCAL SMS SIMULATOR] Sending to 978-566-1008: 🚗 NEW BOOKING ALERT!...
```

---

### 6. **Admin Toast & Sound** 🔊
- **Location**: `BookNow.tsx` → Line 694-706
- **Action**:
  - Shows green toast notification with booking amount
  - Plays cash register sound effect
  - Triggers browser notification (if permitted)

---

### 7. **Redirect to Thank You Page** ✅
- **Location**: `BookNow.tsx` → Line 709
- **Action**: Navigates customer to `/thank-you` with booking details
- **Parameters passed**:
  - Total amount
  - Customer name
  - Scheduled time
  - Scheduled date

---

## How to Test the Complete Flow

### Step 1: Open Browser Console
1. Press `F12` (Chrome/Edge) or `Cmd+Option+I` (Mac)
2. Go to **Console** tab
3. Keep this open during the entire test

### Step 2: Create a Test Booking
1. Navigate to: `http://localhost:6066/book`
2. Fill out the form with test data:
   - **Name**: Test Customer
   - **Email**: testcustomer@example.com
   - **Phone**: 555-1234
   - **Make**: Honda
   - **Model**: Civic
   - **Year**: 2020
   - **Address**: 123 Test St
   - **Date/Time**: Select any future date
   - **Package**: Select any package (e.g., "Premium Detail")
3. Click **"Book Now"** button

### Step 3: Verify Each Process

#### ✅ 1. Check Redirect
- You should be redirected to `/thank-you` page
- Page should show your booking details

#### ✅ 2. Check Console Logs
Look for these 3 log messages in order:
```
[LOCAL EMAIL SIMULATOR] Sending to /api/email/admin: {service: "Premium Detail", ...}
[LOCAL EMAIL SIMULATOR] Sending to /api/email/customer: {to: "testcustomer@example.com", ...}
[LOCAL SMS SIMULATOR] Sending to 978-566-1008: 🚗 NEW BOOKING ALERT!...
```

#### ✅ 3. Check Bell Notification
1. Navigate to admin dashboard: `http://localhost:6066/dashboard/admin`
2. Look at top-right navbar
3. **Expected**: Bell icon should be **yellow** with a **red badge** showing "1"
4. Click the bell
5. **Expected**: Dropdown shows alert: "Web Booking: Test Customer — Premium Detail"

#### ✅ 4. Check Bookings Page
1. Navigate to: `http://localhost:6066/bookings`
2. **Expected**: Your test booking appears in the calendar
3. **Status**: Should show "tentative" (yellow badge)
4. **Customer**: Test Customer
5. **Service**: Premium Detail

#### ✅ 5. Check File Manager
1. Navigate to: `http://localhost:6066/file-manager`
2. **Expected**: New PDF at the top of the list
3. **Filename**: Should include "Test_Customer" and today's date
4. **Category**: Bookings
5. Click "View" to open the PDF
6. **Expected**: PDF shows all booking details

#### ✅ 6. Check Local Storage (Advanced)
1. In browser console, go to **Application** tab
2. Expand **Local Storage** → `http://localhost:6066`
3. Look for keys:
   - `admin_alerts` - Should contain your booking alert
   - `email-log` - Should contain 2 email entries
   - `sms-log` - Should contain 1 SMS entry with phone 978-566-1008

---

## Common Issues & Solutions

### Issue: "Nothing appears in Bookings page"
**Cause**: Store refresh may be needed
**Solution**: 
1. Hard refresh the page (Ctrl+Shift+R)
2. Check browser console for errors
3. Verify `addBooking` was called (check console)

### Issue: "Bell notification doesn't appear"
**Cause**: Admin alerts store not updating
**Solution**:
1. Check if you're logged in as admin (not customer)
2. Navigate away and back to dashboard
3. Check localStorage for `admin_alerts` key

### Issue: "PDF not in File Manager"
**Cause**: `onBookingCreated` function failed
**Solution**:
1. Check console for errors related to PDF generation
2. Verify `pdf-archive` key exists in localStorage
3. Try manually refreshing File Manager page

### Issue: "No console logs for Email/SMS"
**Cause**: API handlers not being called
**Solution**:
1. Ensure `api.js` has the mock handlers (lines 1318-1346)
2. Check Network tab for API calls
3. Verify no JavaScript errors before submission

---

## Enabling REAL Email & SMS Delivery

### For Email (Resend):
1. Sign up at https://resend.com
2. Get your API key
3. Add to `.env`:
   ```
   VITE_RESEND_API_KEY=re_xxxxxxxxxxxx
   ```
4. Create Edge Function or update `api.js` to use Resend SDK

### For SMS (Twilio):
1. Sign up at https://www.twilio.com
2. Get Account SID and Auth Token
3. Add to `.env`:
   ```
   VITE_TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxx
   VITE_TWILIO_AUTH_TOKEN=xxxxxxxxxxxx
   VITE_TWILIO_PHONE_NUMBER=+1234567890
   ```
4. Create Edge Function or update `api.js` to use Twilio SDK

---

## Summary Checklist

When a booking is submitted, verify:
- [ ] Redirected to `/thank-you` page
- [ ] Console shows 3 simulator logs (2 email + 1 SMS)
- [ ] Bell icon is yellow with red badge
- [ ] Alert appears in bell dropdown
- [ ] Booking appears in `/bookings` calendar
- [ ] PDF appears in `/file-manager`
- [ ] Booking status is "tentative"

**If ALL 7 items are checked, the system is working perfectly!**

---

Last Updated: January 16, 2026

# Google Calendar Integration - Troubleshooting Guide

## ✅ What's Already Complete

1. ✅ Google Calendar API is enabled in Google Cloud Console
2. ✅ OAuth 2.0 Client ID created: `197117387632-77kdstpf87m491fdcast1ec9p3g16ua8.apps.googleusercontent.com`
3. ✅ API Key created (starts with `AIza...`)
4. ✅ Database migration run successfully (`app_settings` table exists)
5. ✅ Configuration saves to Supabase correctly
6. ✅ Manual blocking system works perfectly
7. ✅ Availability Manager page displays correctly with blue CalendarCheck icon

---

## 🔧 Remaining Issue: OAuth Connection

**Problem**: "Error retrieving a token" when clicking "Connect Calendar"

**Root Cause**: OAuth redirect URI configuration needs verification + propagation time

---

## 📋 Step-by-Step Fix (When You Return)

### Step 1: Verify Redirect URIs in Google Cloud Console

1. Go to: https://console.cloud.google.com/
2. Select project: **"Prime Auto Detail Calendar"**
3. Click **"APIs & Services"** → **"Credentials"**
4. Click on your OAuth 2.0 Client ID: **"Prime Auto Detail Calendar"**
5. Scroll to **"Authorized redirect URIs"**
6. Verify these URIs are present (add if missing):
   ```
   http://localhost:6066
   https://primeautodetail.net
   ```
7. Also verify **"Authorized JavaScript origins"** section has:
   ```
   http://localhost:6066
   https://primeautodetail.net
   ```
8. Click **"SAVE"** at the bottom
9. **Wait 5-10 minutes** for Google to propagate changes

---

### Step 2: Clear Browser Cache

1. Open Chrome (or your browser)
2. Press **Ctrl + Shift + Delete**
3. Select:
   - **Time range**: All time
   - ✅ Cookies and other site data
   - ✅ Cached images and files
4. Click **"Clear data"**
5. **Close browser completely** (all windows)
6. **Reopen browser**

---

### Step 3: Test the Connection

1. Go to: http://localhost:6066/availability-manager
2. Scroll to **"Google Calendar API Setup"**
3. Verify credentials are shown:
   - Client ID: `197117387632-...`
   - API Key: `AIza...` (dots for security)
   - Calendar ID: `primary`
4. Click **"Connect Calendar"** button
5. **Expected behavior**:
   - A Google OAuth popup window opens
   - You see a Google account selection screen
   - Sign in with your Google account
   - Grant permissions when asked
   - Popup closes
   - Status changes to "Connected" ✅

---

### Step 4: If Still Not Working - Check Browser Console

1. Open Developer Tools (**F12**)
2. Go to **"Console"** tab
3. Click **"Connect Calendar"** again
4. Look for errors that contain:
   - "redirect_uri_mismatch"
   - "origin_mismatch"
   - "invalid_request"
5. Take a screenshot of any error

**Common Error Solutions**:

#### Error: `redirect_uri_mismatch`
- **Fix**: The redirect URI in Google Cloud Console doesn't match your app
- Go back to Step 1 and double-check the URIs EXACTLY match (no trailing slashes, correct protocol)

#### Error: `origin_mismatch`
- **Fix**: Add your origin to "Authorized JavaScript origins" in Google Cloud Console
- Should be: `http://localhost:6066` (no path, just origin)

#### Error: `invalid_client`
- **Fix**: Client ID is incorrect
- Copy the Client ID again from Google Cloud Console → Credentials
- Update it in Availability Manager

---

## 🔍 Advanced Troubleshooting

### Check if Configuration is Saving

1. Open **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Click **"SQL Editor"**
4. Run this query:
   ```sql
   SELECT * FROM app_settings WHERE key = 'calendar_config';
   ```
5. Verify you see your `clientId` and `apiKey` in the `value` column

### Test API Key Manually

Open this URL in your browser (replace `YOUR_API_KEY`):
```
https://www.googleapis.com/calendar/v3/calendars/primary/events?key=YOUR_API_KEY
```

**Expected**: Error about authentication (means API key works)  
**Bad**: 400 error about invalid API key (means API key is wrong)

---

## 📝 Your Current Credentials

**Client ID**: `197117387632-77kdstpf87m491fdcast1ec9p3g16ua8.apps.googleusercontent.com`  
**API Key**: Stored in Supabase (check database to retrieve)  
**Calendar ID**: `primary` (or your Gmail address)

---

## 🚀 Alternative: Test Without OAuth First

If you want to verify the system works without full OAuth:

1. The manual blocking already works!
2. Customers can see blocked dates
3. You can select dates and block times
4. Everything saves to Supabase

Google Calendar is an **enhancement** for two-way sync, but not required for the availability system to function.

---

## 📞 When to Ask for Help

If after completing all steps above it still doesn't work:

1. Take a screenshot of:
   - The Availability Manager page (showing connection status)
   - Browser console (F12 → Console tab)
   - Google Cloud Console → Credentials page
2. Note what happens when you click "Connect Calendar":
   - Does popup open?
   - What error message appears?
   - Does popup close immediately?

---

## ✨ Expected Final Result

Once working, you'll see:

1. **In Availability Manager**:
   - Calendar Connection status: **"Connected"** (green indicator)
   - Your Google account email displayed
   - "Disconnect Calendar" button available

2. **In Bookings Page**:
   - Dates blocked in Google Calendar show as unavailable
   - Personal events appear with gray "Unavailable" + lock icon
   - Work blocks appear with red/blue "Booked"

3. **For Customers**:
   - They see blocked dates (can't book)
   - No personal event details visible (privacy protected)
   - Only see "Not available" for those times

---

## 🎯 Quick Reference Checklist

- [ ] Redirect URIs added in Google Cloud Console
- [ ] JavaScript origins added in Google Cloud Console
- [ ] Waited 5-10 minutes after saving
- [ ] Cleared browser cache completely
- [ ] Restarted browser
- [ ] Tested "Connect Calendar" button
- [ ] Checked browser console for errors
- [ ] Verified configuration in Supabase database

---

**Good luck! The system is 95% done - just needs that OAuth handshake to complete!** 🎉

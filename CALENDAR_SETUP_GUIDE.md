# Google Calendar Integration Setup Guide

## Privacy-Safe Availability System

This integration allows you to sync your Google Calendar availability with your booking system **without exposing any personal information**. Customers will only see available/unavailable time slots - never your event titles, descriptions, or personal details.

---

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Create Project" or select an existing project
3. Name it something like "Prime Auto Detail Booking"
4. Click "Create"

---

## Step 2: Enable Google Calendar API

1. In your project, go to **APIs & Services** → **Library**
2. Search for "Google Calendar API"
3. Click on it and press **Enable**

---

## Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. If prompted, configure the OAuth consent screen:
   - User Type: **External**
   - App name: **Prime Auto Detail**
   - User support email: Your email
   - Developer contact: Your email
   - Scopes: Add `https://www.googleapis.com/auth/calendar.readonly`
   - Test users: Add your Google account email
   - Save and continue

4. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: **Booking System**
   - Authorized JavaScript origins:
     - `http://localhost:6066` (for development)
     - `https://yourdomain.com` (for production)
   - Authorized redirect URIs:
     - `http://localhost:6066` (for development)
     - `https://yourdomain.com` (for production)
   - Click **Create**

5. **Save your Client ID** - you'll need this!

---

## Step 4: Create API Key

1. Still in **Credentials**, click **Create Credentials** → **API key**
2. **Save your API Key** - you'll need this!
3. (Optional) Click **Restrict Key** and limit it to Google Calendar API only

---

## Step 5: Configure in Your App

1. Go to **Administration** → **Calendar Settings** in your app
2. Enter your **Client ID** and **API Key**
3. Set your **Calendar ID** (usually "primary" for your main calendar)
4. Click **Save Configuration**
5. Click **Connect Calendar**
6. Sign in with your Google account
7. Grant read-only calendar access

---

## Step 6: Configure Workload Settings

### Max Bookings Per Day
- Set how many jobs you want to accept per day (recommended: 1-2)
- This prevents overbooking and burnout

### Buffer Time
- Set recovery time between bookings (recommended: 120 minutes)
- Gives you time to prep, travel, and recover

### Recovery Days
- Block entire days from booking (e.g., Sundays for family time)
- These days won't show any available slots

---

## How It Works

### What Customers See
✅ Available time slots (green/clickable)
❌ Unavailable time slots (grayed out/disabled)

### What Customers DON'T See
❌ Event titles ("Doctor appointment", "Lunch with Sarah")
❌ Event descriptions
❌ Event locations
❌ Any personal information

### Privacy Protection
- Uses Google's **Free/Busy** API endpoint only
- Only checks if you're busy or free
- Never accesses event details
- Completely privacy-safe

---

## Blocking Time

### From Google Calendar
1. Create any event in your Google Calendar
2. Mark it as "Busy" (default for most events)
3. That time automatically becomes unavailable for booking

### Types of Events That Block Time
- ✅ Personal appointments
- ✅ Work meetings
- ✅ Doctor visits
- ✅ Family time
- ✅ "Out of office" blocks
- ✅ Any event marked as "Busy"

### Events That DON'T Block Time
- ❌ Events marked as "Free"
- ❌ All-day events marked as "Available"

---

## Testing Your Setup

1. Create a test event in Google Calendar for tomorrow
2. Go to your Book Now page
3. Try to book during that time
4. You should see it's unavailable (no details shown)
5. Try to book at a different time
6. It should work normally

---

## Troubleshooting

### "Connection Failed"
- Check that your Client ID and API Key are correct
- Verify your domain is in Authorized JavaScript Origins
- Make sure Google Calendar API is enabled

### "No Available Times"
- Check your Recovery Days settings
- Verify your calendar isn't completely blocked
- Check Max Bookings Per Day limit

### "Calendar Not Syncing"
- Click "Disconnect" then "Connect Calendar" again
- Check that you granted calendar read permissions
- Verify you're signed in with the correct Google account

---

## Security Notes

- ✅ Read-only access (can't modify your calendar)
- ✅ Only checks busy/free status
- ✅ No personal data exposed
- ✅ You can revoke access anytime at [Google Account Permissions](https://myaccount.google.com/permissions)

---

## Support

If you need help:
1. Check the troubleshooting section above
2. Verify all credentials are correct
3. Make sure Google Calendar API is enabled
4. Test with a simple event first

---

## What Happens When You Block Time

**You create:** "Dentist appointment" at 2 PM Tuesday
**Customers see:** Tuesday 2 PM shows as unavailable (no reason given)
**You maintain:** Complete privacy while preventing double-booking

This is exactly what you wanted - stress-free scheduling that respects your personal life!

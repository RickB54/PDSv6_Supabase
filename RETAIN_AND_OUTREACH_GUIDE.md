# 🚀 Prime Auto Detail: Marketing Outreach & Custom Domain Setup Guide

This guide is saved permanently in your project root as `RETAIN_AND_OUTREACH_GUIDE.md`. You can open, read, or print it directly from your IDE at any time.

---

## 🖨️ Part 1: How to Print Only the Updated Manual Chapters

Your **Prime Auto Detail App Manual** (`/app-manual` page) has a built-in print preview layout designed to allow custom printing:

1. Open your web app and navigate to the **App Manual** page.
2. In the left-hand sidebar (where all the chapters are listed), scroll to the very bottom under **"11: Technical Reference SOPs"**.
3. Click the bright blue **`PDF / PRINT MANUAL`** button.
4. When the browser's standard Print dialog pops up:
   * **To save as a file:** Change the **Destination / Printer** dropdown to **`Save as PDF`**.
   * **To print only the new parts:** Look at the print preview screens on the left to locate the pages showing **"09: MARKETING & RETENTION"** and **"10: SYSTEM SETTINGS & SECURITY"**.
   * Change the **Pages** option from *All* to *Custom* and enter those page numbers (for example: `15-18`).
5. Click the blue **Save** or **Print** button at the bottom of the dialog.

---

## 📧 Part 2: Dynamic Email & Custom Domain Setup

To ensure emails sent from your **Retention Hub** reach your customers' actual inbox (and do not get blocked or filtered), follow these infrastructure setup steps:

### 1. The Resend Sandbox Rule
* **The Sandbox Limit:** By default, a new Resend account is in "Sandbox Mode". In this mode, Resend **strictly blocks** emails sent to anyone except the registered account owner (`Rick.PrimeAutoDetail@gmail.com`). 
* **The Solution:** You must verify your business domain name on Resend to lift this sandbox restriction.

### 2. How to Verify Your Custom Domain on Resend
1. Sign in to your [Resend Dashboard](https://resend.com).
2. Go to **Domains** on the left menu and click **Add Domain**.
3. Enter your custom business domain (for example: `primeprofessionaldetailing.com`).
4. Resend will display a set of **DNS Records** (DKIM and SPF TXT records).
5. Sign in to your domain registrar (GoDaddy, Namecheap, Google Domains, etc.).
6. Go to **DNS Settings** for your domain, add the records provided by Resend, and click Save.
7. Return to Resend and click **Verify**. (Verification usually takes a few minutes).

### 3. Bind the Custom Sender Email Secret in Supabase
Once your domain is verified on Resend, you must tell your database's Edge Function to use it:
1. Open a terminal window in your IDE.
2. Run the following command to bind your custom sender email as a global project secret:
   ```bash
   npx supabase secrets set SENDER_EMAIL="Prime Auto Detail <info@yourverifieddomain.com>" --project-ref kqhaoyaermsqrilhsfxj
   ```
   *(Be sure to replace `info@yourverifieddomain.com` with your actual verified email address).*
3. The server will automatically reload and propagate your verified sender address instantly!

---

## 🚀 Part 3: Marketing Outreach Campaign Templates

Instead of typing marketing follow-ups from scratch, you have **6 client campaigns** and **4 prospect campaigns** loaded directly into your Follow-up Center:

### Customer Retention Campaigns (Follow-up Center)
1. **Seasonal Refresh:** Perfect for transition periods (Spring/Fall prep, salt removal).
2. **Ceramic Coating Booster Care:** Annual or bi-annual check-in for coating warranty compliance.
3. **VIP Maintenance Offer:** Exclusive discounts to secure long-term loyalty.
4. **Referral Incentive:** Incentivizes current customers to refer family and friends.
5. **Holiday Special:** High-converting promo templates for major holidays.
6. **General Follow-Up:** A simple check-in for general vehicle needs.

### Prospect Nurturing Campaigns (Potential Leads)
1. **First-Time Welcome:** Introduces your shop's signature detailing methods.
2. **Special Introductory Discount:** Incentivizes booking that critical first appointment.
3. **Free Add-on Voucher:** Offers a high-value freebie (like rain repellent or windshield protectant).
4. **Limited-Time Booking Slot:** Creates urgency by highlighting filled schedules.

### How they work:
* Selecting a template that mentions an incentive will **automatically toggle on** the loyalty discount option and load your first active voucher code.
* You retain **100% manual control** to edit the template text or subject line inside the preview window before hitting Send!

---

## 🛡️ Part 4: Database Deletion Safety

Today we implemented a safety guard for data cleaning:
* **The Problem:** Deleting virtual test records or client profiles manually could cause database cascades to break or create orphan booking histories.
* **The Solution:** A secure database deletion trigger has been added. When you purge a client profile, the database safely removes associated garage details, files, and bookings cleanly without altering past financial invoice values on your accounting ledger.

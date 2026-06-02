# Customer Workflow & Data Deletion Walkthrough

This guide will walk you through testing the entire end-to-end customer process using your "Rick Berube" test account, and explain exactly how to cleanly remove the test data afterward so your real analytics are unaffected.

## Phase 1: Creating the Test Data (Public or Admin)
1. **Using Auto-Fill Buttons:**
   - In your Admin dashboard or on the public website (Contact / Book Now), look for the button labeled **"🧪 Auto-Fill Rick Berube Test"**. 
   - Clicking this automatically fills out the form with your test details and safely scopes the email to **`rberube54+test@gmail.com`**.
   - Submit the form to generate a test inquiry or booking.

2. **The "Test Data Active" Banner:**
   - As soon as the "Rick Berube" test account is created in the database, a persistent **RED BANNER** will appear at the bottom of your screen.
   - This banner serves as a constant reminder that your dashboard analytics are currently being affected by test data.
   - It will remain visible across the app until the test data is wiped.

## Phase 2: Testing the Customer Portal Login
Because `rberube54@gmail.com` is your Admin email, you cannot use it to view the Customer Portal (the system will always recognize you as the boss and redirect you).
1. **Log out** of your Admin account.
2. Navigate to the **Login Page**.
3. Because you just logged out as an Admin, the system will **automatically pre-fill** the login form with `rberube54+test@gmail.com`.
4. Click Sign In to securely enter the Customer Portal without conflicting with your Admin session.
5. *Note:* Because Gmail ignores the `+test` modifier, all test estimates and invoices will still arrive in your standard `rberube54@gmail.com` inbox!

## Phase 3: Invoicing and Analytics
1. **Converting to Invoice:**
   - Log back in as Admin, convert the approved Estimate to an Invoice.
   - Mark it as "Sent" to trigger the Engagement Sync.
2. **Reviewing Analytics:**
   - Check the **Analytics** page. You will now see your test revenue and numbers actively affecting your overall dashboard.

---

## Phase 4: Wiping the Test Data

**Automated 1-Click Wipeout:**
While normally in a CRM, deleting a customer account *does not* delete their financial records (to protect real revenue data), the system has been explicitly programmed to recognize the "Rick Berube" test account.

### How to Completely Wipe Your Test Footprint:
Simply click the **"Wipe Test Data Now"** button located directly inside the red **"Test Data Active"** banner at the bottom of your screen.

**That is all you have to do.** 

Behind the scenes, the system will instantly cascade the deletion to completely wipe out:
*   All test **Invoices**
*   All test **Estimates**
*   All test **Bookings**
*   All test **Vehicles**
*   All test **Customer Records**

Check your **Analytics** page afterward—you will see that all your numbers, calculations, and charts have instantly reverted back to their previous, real values as if the test account never existed, and the red banner will vanish!

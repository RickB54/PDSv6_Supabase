# Customer Workflow & Data Deletion Walkthrough

This guide will walk you through testing the entire end-to-end customer process using your "Rick Berube" test account, and explain exactly how to cleanly remove the test data afterward so your real analytics are unaffected.

## Phase 1: The Online Customer Experience
1. **Sign In as a Customer:**
   - Open an incognito/private browser window (so you stay logged in as Admin in your main window).
   - Go to your website's Customer Portal login page.
   - Sign in using the email associated with your test account ("Rick Berube").
2. **Requesting a Service:**
   - Navigate to the booking or service request section.
   - Select services (e.g., Detail, Ceramic Coating) and submit a request.
   - *Note on Emails:* Check your test email inbox to see the automated confirmation (assuming your local email provider keys are active).

## Phase 2: Admin Processing (In App)
1. **Review the Request (Admin Side):**
   - In your main browser window (Admin), go to the CRM Dashboard or **Estimates Tracker**.
   - Locate the new request from "Rick Berube".
2. **Generating the Estimate:**
   - Open the request and generate an Estimate.
   - Apply any relevant add-ons or discounts (like the "Friends & Fam" discount we recently fixed).
   - Click "Save & Send" to dispatch it to the customer.
3. **Approving the Estimate (Customer Side):**
   - Switch back to the incognito window (Customer).
   - View the received Estimate in the portal and click "Approve" (or simulate this action).

## Phase 3: Invoicing and Analytics
1. **Converting to Invoice:**
   - As Admin, convert the approved Estimate to an Invoice.
   - Mark it as "Sent" to trigger the Engagement Sync we built recently.
2. **Reviewing Analytics:**
   - Check the **Analytics** page. You will now see your test revenue and numbers actively affecting your overall dashboard.

---

## Phase 4: Wiping the Test Data

**Automated Wipeout specifically for "Rick Berube":**
We have added a custom safety override **exclusively** for your test account. 

While normally in a CRM, deleting a customer account *does not* delete their financial records (to protect real revenue data), the system has been explicitly programmed to recognize the "Rick Berube" test account.

### How to Completely Wipe Your Test Footprint:
1. Navigate to **Search Customers** or the **Customer Profile** for "Rick Berube".
2. Click **Delete**.

**That is all you have to do.** 

Behind the scenes, the system will recognize the name "Rick Berube" and will automatically cascade the deletion to completely wipe out:
*   All test **Invoices**
*   All test **Estimates**
*   All test **Bookings**
*   All test **Vehicles**

Check your **Analytics** page afterward—you will see that all your numbers, calculations, and charts have instantly reverted back to their previous, real values as if the test account never existed!

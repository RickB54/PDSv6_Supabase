# Operations Flow: The Prime Auto Detail Standard

This guide outlines the ideal operational architecture for Prime Auto Detail. Following this workflow ensures data integrity, professional customer experiences, and scalable business growth.

## 1. High-Level Overview
The system is built on a **CRM-First Architecture**. This means the **Customer Record** is the "Master Source of Truth." Everything else—bookings, vehicles, invoices, and service history—is a child of that master record.

---

## 2. The Step-by-Step Workflow

### Phase 1: Lead Capture (The Prospect)
*   **When**: Anytime a potential client calls, texts, or fills out a generic contact form.
*   **Action**: Create a record in the **Prospects** page.
*   **Why**: This allows you to track interest and send follow-up estimates without cluttering your active "Customer" list.
*   **Linked Records**: Only the contact info and initial inquiry notes.

### Phase 2: The Commitment (The Booking)
*   **When**: Once the client agrees to a service and date.
*   **Proper Order**:
    1.  Go to **Bookings**.
    2.  Select/Create the client.
    3.  Assign the **Vehicle** from their "Garage" (or add a new one).
    4.  Select the **Package** (Logic: Vehicle Class + Package = Auto-Price).
*   **Status**: Initial status should be **Confirmed** or **Tentative**.

### Phase 3: Preparation (The Setup)
*   **When**: Day of service.
*   **Action**: Use the **Service Checklist**.
*   **Tools**: Open the **Prep Summary** PDF to gather exactly the chemicals and equipment needed for that specific vehicle/package combination.

### Phase 4: Execution (The Service)
*   **When**: On-site with the vehicle.
*   **Action**: Start the **Job Timer** in the Checklist.
*   **Logic**: Every checked item creates a permanent timestamp for quality control and employee performance analytics.
*   **Inspection**: Perform the pre-service walkaround using the digital inspection tools.

### Phase 5: Completion & Billing
*   **When**: Service is finished.
*   **Action**: Click "Finish & Complete Job." 
*   **Automation**: This stops the timer and creates a **Pending Invoice**.
*   **Payment**: Collect payment immediately via the mobile-responsive interface. Mark as **Paid**.

### Phase 6: The Cycle (Retention)
*   **When**: 4–8 weeks after service.
*   **Action**: The **Follow-Up Center** highlights the client based on their maintenance cycle.
*   **Goal**: Reach out with a professional "Maintenance Detail" reminder to turn them into a lifetime recurring customer.

---

## 3. Specific Flow Scenarios

### A. Admin-Created Bookings (Manual Entry)
1.  **Search First**: Always search the CRM before typing a new name.
2.  **Verify Info**: Confirm phone/email to avoid duplicate profiles.
3.  **Price Check**: Ensure the **Vehicle Type** (Compact vs Truck) is correct, as it controls the master price.

### B. Customer Self-Bookings (Website)
1.  **Automation**: The system automatically creates a **New Prospect** if they don't exist.
2.  **Notification**: You receive a "NEW BOOKING" alert.
3.  **Review**: You simply open the booking and click **Approve** to move it to the calendar. No manual data entry needed!

### C. Returning Customers
1.  **Quick Select**: In the Booking modal, search their name. 
2.  **The Garage**: Their saved vehicles appear instantly. Click the car, pick the new service, and save. **Total time: <30 seconds.**

---

## 4. Smart System Logic & Best Practices

*   **Master Records**: **Customers** are the master. **Bookings** are historical events. Never delete a Customer if they have a Booking history; use the **Archive** feature instead to hide them from daily view while preserving tax and service records.
*   **The "Never Delete" Rule**: Never delete Invoices or Paid Records. If an error occurs, "Cancel" or "Refund" them to maintain a clear audit trail for your accountant.
*   **Duplicates**: Duplicate customers are the #1 cause of "lost" history. If you accidentally create a second profile for "John Smith," use the **Merge** or **Cleanup** tools immediately.
*   **Lifecycle**: Prospect → Booking → Active Customer → Maintenance Cycle → Lifetime VIP.

---

## 5. Suggested Status Flow
1.  **Tentative**: Customer has requested a time but hasn't confirmed.
2.  **Confirmed**: Appointment is locked in the calendar.
3.  **In Progress**: Technician is currently working on the car (Timer is running).
4.  **Done**: Job is finished, awaiting payment.
5.  **Completed**: Paid and finalized.
6.  **Cancelled/Blocked**: Appointment didn't happen (Preserves the time slot for history).

---

## 6. Pro Recommendations
*   **Scalability**: Don't skip the **Vehicle Class** selection. It might seem small, but as your business grows, automated pricing based on size is the only way to avoid manual quoting errors.
*   **Relationship Type**: Use the toggle in the customer profile to move people between "Prospect" and "Customer" manually if they cancel before their first job.

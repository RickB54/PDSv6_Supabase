# Booking Request System - Implementation Plan

## ✅ **Syntax Errors Fixed!**
The help documentation errors have been resolved.

---

## 📋 **Booking Request System - Your Recommendation #1**

### **Current Situation:**
- Employees can currently create bookings directly
- No admin approval process
- No notification system for booking requests

### **What Needs to Be Implemented:**

---

## **1. Database Changes**

### **Add `status` Field to Bookings Table:**
```sql
ALTER TABLE bookings 
ADD COLUMN status TEXT DEFAULT 'pending' 
CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled'));

-- For existing bookings, set to 'confirmed'
UPDATE bookings SET status = 'confirmed' WHERE status IS NULL;
```

### **Status Values:**
- `pending` - Employee created, awaiting admin confirmation
- `confirmed` - Admin confirmed, customer contacted
- `completed` - Job finished
- `cancelled` - Booking cancelled

---

## **2. Permissions Update**

### **Employee Permissions:**
- ✅ Can create bookings with status = 'pending'
- ✅ Can view all bookings (to see schedule)
- ❌ Cannot edit bookings
- ❌ Cannot delete bookings
- ❌ Cannot change status to 'confirmed'

### **Admin Permissions:**
- ✅ Full access to all bookings
- ✅ Can change status from 'pending' to 'confirmed'
- ✅ Can edit/delete any booking
- ✅ See "Pending Bookings" section

---

## **3. UI Changes**

### **Bookings Page - Admin View:**
```
Bookings Calendar
├── 🔔 Pending Bookings (X) ← NEW SECTION
│   ├── Shows all status='pending' bookings
│   ├── Each with "Confirm" and "Reject" buttons
│   └── Badge shows count
├── Calendar View
│   └── Only shows 'confirmed' bookings
└── All Bookings List
    └── Shows all bookings with status badges
```

### **Bookings Page - Employee View:**
```
Bookings Calendar
├── Create Booking Request Button
│   └── Creates booking with status='pending'
├── Calendar View (Read-Only)
│   └── Shows confirmed bookings only
└── My Requests
    └── Shows their pending requests
```

---

## **4. Notification System**

### **Bell Notification:**
```typescript
// When employee creates booking request:
1. Create booking with status='pending'
2. Create admin alert:
   {
     type: 'booking_request',
     title: 'New Booking Request',
     message: 'Paul requested booking for John Doe on 12/27/2025',
     booking_id: 'xxx'
   }
3. Admin sees bell notification
4. Click notification → Opens Pending Bookings
```

### **PDF Generation:**
```typescript
// Generate PDF when booking request created:
{
  title: 'Booking Request',
  employee: 'Paul',
  customer: 'John Doe',
  requested_date: '12/27/2025',
  requested_time: '10:00 AM',
  services: ['Full Detail'],
  status: 'Pending Admin Confirmation'
}
// Save to File Manager under "Booking Requests" folder
```

---

## **5. Workflow**

### **Employee Creates Booking Request:**
```
1. Employee clicks "Create Booking Request"
2. Fills in:
   - Customer name
   - Requested date/time
   - Services needed
   - Notes
3. Clicks "Submit Request"
4. System:
   - Creates booking with status='pending'
   - Generates PDF → File Manager
   - Creates admin notification
   - Shows success message
5. Employee sees: "Request submitted! Admin will confirm."
```

### **Admin Reviews & Confirms:**
```
1. Admin sees bell notification (🔔 1)
2. Opens Bookings page
3. Sees "Pending Bookings (1)" section
4. Reviews request details
5. Calls/emails customer
6. Confirms date/time with customer
7. Clicks "Confirm Booking"
8. System:
   - Changes status to 'confirmed'
   - Adds to calendar
   - Notifies employee
   - Updates PDF status
```

### **Admin Rejects Request:**
```
1. Admin clicks "Reject"
2. Adds rejection reason
3. System:
   - Changes status to 'cancelled'
   - Notifies employee with reason
   - Removes from pending list
```

---

## **6. Code Changes Needed**

### **Files to Modify:**

1. **Database Migration:**
   - Add `status` column to bookings table
   - Update existing bookings to 'confirmed'

2. **`src/pages/BookingsPage.tsx`:**
   - Add "Pending Bookings" section for admins
   - Add status badges to booking cards
   - Add "Confirm" and "Reject" buttons
   - Filter calendar to show only confirmed bookings
   - Employee view: Create request (not confirmed booking)

3. **`src/lib/supa-data.ts`:**
   - Update `addBooking` to accept status parameter
   - Add `confirmBooking(id)` function
   - Add `rejectBooking(id, reason)` function
   - Add `getPendingBookings()` function

4. **`src/store/alerts.ts`:**
   - Add 'booking_request' alert type
   - Create alert when booking request created

5. **PDF Generation:**
   - Create `generateBookingRequestPDF()` function
   - Save to File Manager under "Booking Requests"

6. **Help Documentation:**
   - Update Bookings help for admins
   - Update Bookings help for employees
   - Explain booking request workflow

---

## **7. Notification Details**

### **Admin Alert:**
```typescript
{
  id: 'xxx',
  type: 'booking_request',
  title: 'New Booking Request',
  message: 'Paul requested booking for John Doe on 12/27/2025 at 10:00 AM',
  created_at: '2025-12-26T19:00:00Z',
  read: false,
  booking_id: 'booking-xxx',
  employee_name: 'Paul',
  customer_name: 'John Doe'
}
```

### **Bell Icon:**
```
🔔 (3) ← Shows count of unread alerts
Click → Opens alerts panel
Shows: "New Booking Request from Paul"
Click alert → Opens Bookings page, scrolls to Pending section
```

---

## **8. PDF Content**

### **Booking Request PDF:**
```
═══════════════════════════════════════
        BOOKING REQUEST
═══════════════════════════════════════

Status: Pending Admin Confirmation

REQUESTED BY:
Employee: Paul
Date Submitted: 12/26/2025 7:00 PM

CUSTOMER INFORMATION:
Name: John Doe
Phone: (555) 123-4567
Email: john@example.com

REQUESTED BOOKING:
Date: December 27, 2025
Time: 10:00 AM
Duration: 3 hours

SERVICES REQUESTED:
• Full Detail Package
• Interior Deep Clean
• Paint Correction

NOTES:
Customer is a walk-in prospect.
Interested in monthly service.

═══════════════════════════════════════
Admin Action Required:
□ Call customer to confirm
□ Adjust date/time if needed
□ Confirm booking in system
═══════════════════════════════════════
```

---

## **9. Testing Checklist**

### **As Employee:**
- [ ] Can create booking request
- [ ] Request shows as "Pending"
- [ ] Cannot confirm own requests
- [ ] Can view calendar (read-only)
- [ ] Can see own pending requests
- [ ] Receives notification when admin confirms/rejects

### **As Admin:**
- [ ] Sees bell notification for new requests
- [ ] Sees "Pending Bookings" section
- [ ] Can confirm booking requests
- [ ] Can reject booking requests
- [ ] PDF generated in File Manager
- [ ] Confirmed bookings appear in calendar
- [ ] Can edit/delete any booking

---

## **10. Benefits**

✅ **Admin Control** - You approve all bookings
✅ **Customer Contact** - You call/email personally
✅ **Schedule Control** - You fit it into your schedule
✅ **Professional** - Customers get admin confirmation
✅ **No Conflicts** - You manage the calendar
✅ **Employee Empowerment** - They can still capture bookings
✅ **Audit Trail** - PDF record of all requests
✅ **Notifications** - You're alerted immediately

---

## **11. Implementation Steps**

1. ✅ **Database Migration** - Add status column
2. ✅ **Update Bookings Page** - Add pending section
3. ✅ **Update Permissions** - Employee creates pending only
4. ✅ **Add Notifications** - Bell alerts for requests
5. ✅ **PDF Generation** - Booking request PDFs
6. ✅ **Update Help** - Document new workflow
7. ✅ **Testing** - Test as employee and admin

---

## **12. Estimated Time**

- Database changes: 15 minutes
- Bookings page updates: 2 hours
- Notification system: 1 hour
- PDF generation: 1 hour
- Help documentation: 30 minutes
- Testing: 1 hour

**Total: ~5-6 hours**

---

## **Next Steps**

**Would you like me to:**
1. ✅ Start with database migration?
2. ✅ Implement the Pending Bookings section?
3. ✅ Add notification system?
4. ✅ Generate PDFs?
5. ✅ Do all of the above?

**Or would you prefer:**
- A simpler approach (view-only bookings for employees)?
- A different workflow?

---

**This is a comprehensive system that gives you full control while empowering employees to capture bookings!** 🎯

**Let me know if you want me to proceed with implementation!**

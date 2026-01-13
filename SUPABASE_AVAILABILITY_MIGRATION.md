# Supabase Availability Migration Guide

This guide explains the changes made to migrate the manual availability blocking system from `localStorage` to **Supabase**. This ensures that your blocked dates and slots are synchronized across all your devices (desktop, laptop, mobile).

## Key Changes

### 1. Database Storage
- **Old System:** Blocks were stored in your browser's `localStorage`. This meant blocks made on one computer didn't show up on another.
- **New System:** Blocks are stored in a Supabase table called `availability_blocks`. All devices connect to this same database.

### 2. Synchronization
- **Real-time Updates:** When you block a date on one device, it saves to the cloud. Other devices will see it upon refresh or reload.
- **Unified View:** Your "Availability Manager", "Bookings Calendar", and customer-facing "Book Now" calendar all pull from this single source of truth.

### 3. Business Hours & Logic
- **Updated Hours:** Business hours are now strictly set to **8:00 AM - 4:00 PM** (08:00 - 16:00) in the code.
- **Async Operations:** The codebase has been updated to handle data fetching asynchronously (using `await`), ensuring the UI doesn't freeze or show stale data while loading from the cloud.

## Installation / Setup

If you haven't already, you must run the migration SQL script to create the table in your Supabase project.

1.  **Go to Supabase Dashboard:** [https://supabase.com/dashboard](https://supabase.com/dashboard)
2.  **Open SQL Editor:** Click on the SQL icon in the left sidebar.
3.  **New Query:** Create a new query.
4.  **Paste & Run:** Copy the content of `supabase/migrations/create_availability_blocks.sql` and run it.

```sql
-- Quick check: The table schema
CREATE TABLE IF NOT EXISTS public.availability_blocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);
```

## How to Use

The **Availability Manager** page works exactly as before, but now with cloud power:

-   **Block Full Day:** Select a date -> Click "Block Full Day".
-   **Block Time Range:** Select a date -> Enter Start/End time -> "Block Time Range".
-   **Multi-Select:** 
    -   Click dates to select (Mobile: tap multiple).
    -   Desktop: Ctrl+Click to toggle, Shift+Click for range.
    -   "Block Selected Days" will save all blocks to Supabase.
-   **Refresh:** Use the "Refresh" button (top right of blocks list) to pull the latest blocks from other devices if needed.

## Troubleshooting

-   **Blocks not showing?** Click "Refresh" in Availability Manager.
-   **"Network Error"?** Check your internet connection and Supabase API keys in `.env`.
-   **Old blocks missing?** Blocks created *before* this migration (stored in localStorage) are **not** automatically moved to Supabase. You will need to re-enter them in the new system once (this is a one-time task).

## For Developers (Code Structure)

-   `src/lib/availability.ts`: Core functions (`getBlockedSlots`, `blockFullDay`, etc.) now interact with Supabase.
-   `src/pages/AvailabilityManager.tsx`: Updated to use `async/await` for UI responsiveness.
-   `src/lib/unifiedCalendar.ts`: Combines manual blocks with bookings and Google Calendar.
-   `bookings` table vs `availability_blocks`: 
    -   `bookings`: Real customer appointments.
    -   `availability_blocks`: Admin-defined "Do Not Book" periods.

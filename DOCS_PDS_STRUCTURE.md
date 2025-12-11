# PDSv6 App Structure & Analysis

## Overview
PDSv6 is a React/Vite application currently transitioning from a local-first architecture (using `localforage` and dummy data) to a Supabase-backed architecture.
State definitions are largely managed via `zustand`.

## Core Entities
Based on the codebase analysis, the following entities exist:

| Entity | Current Storage | Notes |
| :--- | :--- | :--- |
| **User/Profile** | `localStorage`/`localforage` + specific Supabase `app_users` table logic in `auth.ts` | Distinguishes between `admin`, `employee`, `customer`. |
| **Tasks/Todos** | `localforage` (`tasks.ts`) | extensive logic for deadlines, priorities, assignees, checkists. |
| **Customers** | `localforage` + `supabase.from('customers')` referenced | extensive profile data. |
| **Employees** | `localforage` (implied) | referenced in assignments. |
| **Inventory** | `src/data/detailingChemicals.ts` | thorough static data, needs DB migration. |
| **Services/Packages** | `src/pages/PackagePricing.tsx` | Pricing logic often hardcoded or in local state. |
| **Bookings/Jobs** | `src/pages/BookingsPage.tsx` | Currently local. |
| **Invoices/Estimates** | `src/pages/Invoicing.tsx` | Currently local. |

## Communication Features
The app contains several areas implying communication:
1.  **Tasks System** (`src/store/tasks.ts`):
    - Assignees (Admin -> Employee).
    - Comments (Admin <-> Employee).
    - Status updates (Employee -> Admin).
    - "Read Receipts".
2.  **Alerts/Notifications**:
    - `src/lib/adminAlerts.ts` (implied).
    - `src/lib/employeeNotifications.ts` (implied).
3.  **Job/Work Order Follow-ups**:
    - Auto-generated tasks upon work order completion.

## Architecture Change Requirements
1.  **Auth**: Force `VITE_AUTH_MODE=supabase`. Remove Netlify Identity/Local fallback.
2.  **Data**:
    - Migrate `src/store/tasks.ts` to use Supabase `tasks` table.
    - Create `inventory`, `services`, `bookings` tables.
3.  **Roles**:
    - `app_users` table is the source of truth for roles.
    - `ProtectedRoute` in `App.tsx` already supports role-based gating.

## Key Files
- `src/App.tsx`: Routing & Role Protection.
- `src/lib/auth.ts`: Authentication Logic (needs cleanup to focus on Supabase).
- `src/store/tasks.ts`: Task Logic (needs backend integration).
- `src/pages/AdminDashboard.tsx`: Main Admin View.
- `src/pages/EmployeeDashboard.tsx`: Main Employee View.

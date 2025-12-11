# PDSv6 Database Schema

## Core Tables

### `app_users`
Extends `auth.users`.
- `id` (uuid, PK, references auth.users)
- `email` (text)
- `role` (text: 'admin', 'employee', 'customer')
- `name` (text)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `customers`
- `id` (uuid, PK) - may match auth.users.id if customer creates account
- `full_name` (text)
- `email` (text)
- `phone` (text)
- `address` (text)
- `notes` (text)
- `created_at` (timestamptz)

### `employees`
- `id` (uuid, PK) - references `app_users.id`
- `job_title` (text)
- `hourly_rate` (numeric)
- `hire_date` (date)
- `status` (text: 'active', 'terminated')

### `tasks`
Migrated from `tasks.ts`.
- `id` (uuid, PK)
- `title` (text)
- `description` (text)
- `status` (text: 'not_started', 'in_progress', 'completed', etc)
- `priority` (text)
- `due_date` (date)
- `due_time` (time)
- `customer_id` (uuid, FK customers)
- `vehicle_id` (uuid, FK vehicles)
- `created_by` (uuid, FK app_users)
- `assigned_to` (uuid[], array of app_users IDs) OR separate `task_assignments` table
- `checklist` (jsonb) - stores the sub-items
- `attachments` (jsonb)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `task_comments`
- `id` (uuid, PK)
- `task_id` (uuid, FK tasks)
- `user_id` (uuid, FK app_users)
- `content` (text)
- `created_at` (timestamptz)

### `bookings` (Jobs)
- `id` (uuid, PK)
- `customer_id` (uuid, FK customers)
- `vehicle_id` (uuid, FK vehicles)
- `service_package` (text)
- `scheduled_at` (timestamptz)
- `status` (text: 'scheduled', 'in_progress', 'completed', 'cancelled')
- `total_price` (numeric)
- `assigned_employee_id` (uuid, FK employees)

### `payments` (Stripe)
- `id` (uuid, PK)
- `booking_id` (uuid, FK bookings)
- `stripe_payment_intent_id` (text)
- `amount` (numeric)
- `status` (text)
- `created_at` (timestamptz)

### `inventory_items`
- `id` (uuid, PK)
- `name` (text)
- `category` (text)
- `quantity` (integer)
- `unit_cost` (numeric)
- `reorder_point` (integer)

## RLS Policies (Draft)
- **Admins**: ALL access (create, read, update, delete) on ALL tables.
- **Employees**:
    - `tasks`: READ where `assigned_to` contains auth.uid(). UPDATE `status`, `checklist` where `assigned_to` contains auth.uid().
    - `task_comments`: READ where task is visible. CREATE own comments.
    - `bookings`: READ where `assigned_employee_id` == auth.uid().
- **Customers**:
    - READ own profile, own bookings.

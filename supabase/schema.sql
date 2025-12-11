-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ROLES & USERS
-- app_users table extends auth.users
create table public.app_users (
  id uuid references auth.users not null primary key,
  email text,
  name text,
  role text check (role in ('admin', 'employee', 'customer', 'customer_prospect')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.app_users enable row level security;

-- Policies for app_users
create policy "Public profiles are viewable by everyone" on public.app_users
  for select using (true);

create policy "Users can insert their own profile" on public.app_users
  for insert with check (auth.uid() = id);

create policy "Users can update own profile" on public.app_users
  for update using (auth.uid() = id);

-- CUSTOMERS
create table public.customers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.app_users(id), -- Optional link to auth user
  full_name text not null,
  email text,
  phone text,
  address text,
  city text,
  state text,
  zip text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.customers enable row level security;

-- EMPLOYEES
create table public.employees (
  id uuid primary key references public.app_users(id),
  job_title text,
  hourly_rate numeric,
  hire_date date,
  status text default 'active',
  created_at timestamptz default now()
);

alter table public.employees enable row level security;

-- VEHICLES
create table public.vehicles (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid references public.customers(id) not null,
  make text,
  model text,
  year integer,
  color text,
  license_plate text,
  vin text,
  type text, -- sedan, suv, truck, etc.
  created_at timestamptz default now()
);

alter table public.vehicles enable row level security;

-- TASKS (ToDo / Team Comms)
create table public.tasks (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  status text default 'not_started',
  priority text default 'medium',
  due_date date,
  due_time time,
  customer_id uuid references public.customers(id),
  vehicle_id uuid references public.vehicles(id),
  created_by uuid references public.app_users(id),
  checklist jsonb default '[]'::jsonb,
  attachments jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.tasks enable row level security;

-- Task Assignments (Many-to-Many)
create table public.task_assignments (
  task_id uuid references public.tasks(id) on delete cascade,
  user_id uuid references public.app_users(id) on delete cascade,
  primary key (task_id, user_id)
);

alter table public.task_assignments enable row level security;

-- Task Comments
create table public.task_comments (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid references public.tasks(id) on delete cascade,
  user_id uuid references public.app_users(id),
  content text not null,
  created_at timestamptz default now()
);

alter table public.task_comments enable row level security;

-- BOOKINGS (Jobs)
create table public.bookings (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid references public.customers(id),
  vehicle_id uuid references public.vehicles(id),
  service_package text,
  service_price numeric,
  scheduled_at timestamptz,
  status text default 'scheduled',
  assigned_employee_id uuid references public.employees(id),
  notes text,
  created_at timestamptz default now()
);

alter table public.bookings enable row level security;

-- INVENTORY
create table public.inventory_items (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text,
  quantity integer default 0,
  unit_cost numeric default 0,
  min_stock_level integer default 5,
  created_at timestamptz default now()
);

alter table public.inventory_items enable row level security;

-- PAYMENTS (Stripe)
create table public.payments (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid references public.bookings(id),
  stripe_payment_intent_id text,
  amount numeric,
  currency text default 'usd',
  status text,
  created_at timestamptz default now()
);

alter table public.payments enable row level security;

-- BASIC RLS POLICIES (Simplified for initial setup)
-- Admin Access Policy (applied to all tables conceptually, but needs specific grant)
-- For this script, we'll create a policy for 'tasks' as an example.

-- Tasks:
create policy "Admins can do everything on tasks" on public.tasks
  for all using (
    exists (select 1 from public.app_users where id = auth.uid() and role = 'admin')
  );

create policy "Employees can view assigned tasks" on public.tasks
  for select using (
    exists (select 1 from public.task_assignments where task_id = id and user_id = auth.uid())
    or created_by = auth.uid()
  );

create policy "Employees can update assigned tasks" on public.tasks
  for update using (
    exists (select 1 from public.task_assignments where task_id = id and user_id = auth.uid())
  );

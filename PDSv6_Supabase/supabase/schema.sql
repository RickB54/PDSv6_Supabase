-- Supabase schema for Prime Detail Solutions
-- Tables and RLS policies for admin/employee secure access

-- Helper functions for role checks
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select exists(
    select 1 from public.app_users u where u.id = auth.uid() and u.role = 'admin'
  );
$$;

create or replace function public.is_employee()
returns boolean language sql stable as $$
  select exists(
    select 1 from public.app_users u where u.id = auth.uid() and u.role in ('employee','admin')
  );
$$;

-- App users mapping table (used by application for role checks)
create table if not exists public.app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  role text check (role in ('admin','employee','customer')) not null default 'customer',
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean default true
);
alter table public.app_users enable row level security;
-- Allow users to view their own record; admins see all
create policy if not exists app_users_self_select on public.app_users
  for select using (auth.uid() = id or public.is_admin());
 -- Admin can insert/update; delete disabled by policy omission
 do $$ begin
   if exists (
     select 1 from pg_policies where schemaname='public' and tablename='app_users' and policyname='app_users_admin_modify'
   ) then
     drop policy app_users_admin_modify on public.app_users;
   end if;
 end $$;
 create policy if not exists app_users_admin_select on public.app_users
   for select using (public.is_admin());
 create policy if not exists app_users_admin_insert on public.app_users
   for insert with check (public.is_admin());
 create policy if not exists app_users_admin_update on public.app_users
   for update using (public.is_admin()) with check (public.is_admin());
 -- Users can update their own profile row
 create policy if not exists app_users_self_update on public.app_users
   for update using (auth.uid() = id) with check (auth.uid() = id);

 -- Bootstrap role on new auth.users signup (trigger + function)
 create or replace function public.bootstrap_role()
 returns trigger
 security definer
 set search_path = public, pg_temp
 language plpgsql as $$
 declare
   user_role text := 'customer';
 begin
   -- Assign admin for the primary company email; others default to customer
   if lower(new.email) = 'primedetailsolutions.ma.nh@gmail.com' then
     user_role := 'admin';
   else
     user_role := 'customer';
   end if;

   -- Upsert into app_users; allow function to bypass RLS via security definer
   insert into public.app_users (id, email, role, name, is_active, created_at, updated_at)
   values (new.id, new.email, user_role, null, true, now(), now())
   on conflict (id) do update
     set email = excluded.email,
         role = excluded.role,
         updated_at = now();

   return new;
 end;
 $$;

 -- Create trigger on auth.users after insert to call bootstrap_role
 do $$ begin
   if exists (
     select 1 from pg_trigger t
     join pg_class c on c.oid = t.tgrelid
     join pg_namespace n on n.oid = c.relnamespace
     where t.tgname = 'on_auth_user_created' and n.nspname = 'auth' and c.relname = 'users'
   ) then
     drop trigger on_auth_user_created on auth.users;
   end if;
 end $$;
 create trigger on_auth_user_created
   after insert on auth.users
   for each row
   execute procedure public.bootstrap_role();

-- Services catalog (optional, minimal)
create table if not exists public.services (
  id text primary key,
  name text not null,
  description text,
  category text,
  price_min numeric,
  price_max numeric,
  duration integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.services enable row level security;
create policy if not exists services_read on public.services for select using (public.is_employee());
create policy if not exists services_admin_write on public.services for all using (public.is_admin()) with check (public.is_admin());

-- Ensure idempotent columns for services
alter table if exists public.services
  add column if not exists is_active boolean default true,
  add column if not exists updated_at timestamptz default now();

-- Packages
create table if not exists public.packages (
  id text primary key,
  name text not null,
  description text,
  compact_price numeric,
  midsize_price numeric,
  truck_price numeric,
  luxury_price numeric,
  discount_percent numeric,
  discount_start timestamptz,
  discount_end timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.packages enable row level security;
create policy if not exists packages_read on public.packages for select using (public.is_employee());
create policy if not exists packages_admin_write on public.packages for all using (public.is_admin()) with check (public.is_admin());

-- Ensure idempotent columns for existing deployments
alter table if exists public.packages
  add column if not exists description text,
  add column if not exists compact_price numeric,
  add column if not exists midsize_price numeric,
  add column if not exists truck_price numeric,
  add column if not exists luxury_price numeric,
  add column if not exists discount_percent numeric,
  add column if not exists discount_start timestamptz,
  add column if not exists discount_end timestamptz,
  add column if not exists is_active boolean default true,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

-- Add-ons
create table if not exists public.add_ons (
  id text primary key,
  name text not null,
  description text,
  compact_price numeric,
  midsize_price numeric,
  truck_price numeric,
  luxury_price numeric,
  discount_percent numeric,
  discount_start timestamptz,
  discount_end timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.add_ons enable row level security;
create policy if not exists add_ons_read on public.add_ons for select using (public.is_employee());
create policy if not exists add_ons_admin_write on public.add_ons for all using (public.is_admin()) with check (public.is_admin());

-- Ensure idempotent columns for existing deployments
alter table if exists public.add_ons
  add column if not exists description text,
  add column if not exists compact_price numeric,
  add column if not exists midsize_price numeric,
  add column if not exists truck_price numeric,
  add column if not exists luxury_price numeric,
  add column if not exists discount_percent numeric,
  add column if not exists discount_start timestamptz,
  add column if not exists discount_end timestamptz,
  add column if not exists is_active boolean default true,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

-- Vehicle types
create table if not exists public.vehicle_types (
  id text primary key,
  name text not null,
  description text,
  size text,
  multiplier numeric default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.vehicle_types enable row level security;
create policy if not exists vehicle_types_read on public.vehicle_types for select using (public.is_employee());
create policy if not exists vehicle_types_admin_write on public.vehicle_types for all using (public.is_admin()) with check (public.is_admin());

alter table if exists public.vehicle_types
  add column if not exists is_active boolean default true,
  add column if not exists updated_at timestamptz default now();

-- Bookings
create table if not exists public.bookings (
  id bigserial primary key,
  customer_name text,
  phone text,
  email text,
  vehicle_type text,
  package text,
  add_ons jsonb,
  date timestamptz,
  notes text,
  price_total numeric,
  status text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.bookings enable row level security;
create policy if not exists bookings_read on public.bookings for select using (public.is_employee());
create policy if not exists bookings_create on public.bookings for insert with check (public.is_employee());
create policy if not exists bookings_admin_write on public.bookings for update using (public.is_admin()) with check (public.is_admin());
create policy if not exists bookings_admin_delete on public.bookings for delete using (public.is_admin());
-- Customer visibility and control over their own bookings
alter table if exists public.bookings add column if not exists customer_id uuid references auth.users(id);
create policy if not exists bookings_customer_select on public.bookings for select using (customer_id = auth.uid());
create policy if not exists bookings_customer_insert on public.bookings for insert with check (customer_id = auth.uid());
create policy if not exists bookings_customer_update on public.bookings for update using (customer_id = auth.uid()) with check (customer_id = auth.uid());

alter table if exists public.bookings
  add column if not exists updated_at timestamptz default now();

-- Contact messages
create table if not exists public.contact_messages (
  id bigserial primary key,
  name text,
  email text,
  phone text,
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.contact_messages enable row level security;
create policy if not exists contact_read on public.contact_messages for select using (public.is_employee());
create policy if not exists contact_create on public.contact_messages for insert with check (public.is_employee());
create policy if not exists contact_admin_modify on public.contact_messages for update using (public.is_admin()) with check (public.is_admin());
create policy if not exists contact_admin_delete on public.contact_messages for delete using (public.is_admin());

alter table if exists public.contact_messages
  add column if not exists updated_at timestamptz default now();

-- Todos
create table if not exists public.todos (
  id bigserial primary key,
  title text not null,
  status text,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);
alter table public.todos enable row level security;
create policy if not exists todos_read on public.todos for select using (public.is_employee());
create policy if not exists todos_create on public.todos for insert with check (public.is_employee());
create policy if not exists todos_admin_modify on public.todos for update using (public.is_admin()) with check (public.is_admin());
create policy if not exists todos_admin_delete on public.todos for delete using (public.is_admin());

alter table if exists public.todos
  add column if not exists updated_at timestamptz default now();
alter table if exists public.todos
  add column if not exists is_active boolean default true;

-- Inventory
create table if not exists public.inventory (
  id bigserial primary key,
  item_name text not null,
  quantity integer not null default 0,
  min_required integer not null default 0,
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);
alter table public.inventory enable row level security;
create policy if not exists inventory_read on public.inventory for select using (public.is_employee());
create policy if not exists inventory_admin_write on public.inventory for all using (public.is_admin()) with check (public.is_admin());

alter table if exists public.inventory
  add column if not exists is_active boolean default true;

-- Coupons
create table if not exists public.coupons (
  code text primary key,
  type text check (type in ('percent','amount')) not null,
  value numeric not null,
  applies_to text,
  usage_limit integer,
  active boolean not null default true,
  start timestamptz,
  "end" timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.coupons enable row level security;
create policy if not exists coupons_read on public.coupons for select using (public.is_employee());
create policy if not exists coupons_admin_write on public.coupons for all using (public.is_admin()) with check (public.is_admin());

-- Customers
alter table if exists public.customers enable row level security;
create policy if not exists customers_read on public.customers for select using (public.is_employee());
create policy if not exists customers_admin_write on public.customers for update using (public.is_admin()) with check (public.is_admin());
create policy if not exists customers_admin_delete on public.customers for delete using (public.is_admin());
-- Customers can view and modify only their own profile
create policy if not exists customers_self_select on public.customers for select using (id = auth.uid());
create policy if not exists customers_self_insert on public.customers for insert with check (id = auth.uid());
create policy if not exists customers_self_update on public.customers for update using (id = auth.uid()) with check (id = auth.uid());

-- Invoices
alter table if exists public.invoices enable row level security;
-- Ensure per-customer access via customer_id
alter table if exists public.invoices add column if not exists customer_id uuid references auth.users(id);
create policy if not exists invoices_read on public.invoices for select using (public.is_employee());
create policy if not exists invoices_customer_select on public.invoices for select using (customer_id = auth.uid());
create policy if not exists invoices_customer_update on public.invoices for update using (customer_id = auth.uid()) with check (customer_id = auth.uid());
create policy if not exists invoices_admin_write on public.invoices for update using (public.is_admin()) with check (public.is_admin());
create policy if not exists invoices_admin_delete on public.invoices for delete using (public.is_admin());

-- Expenses
alter table if exists public.expenses enable row level security;
create policy if not exists expenses_read on public.expenses for select using (public.is_employee());
create policy if not exists expenses_admin_write on public.expenses for update using (public.is_admin()) with check (public.is_admin());
create policy if not exists expenses_admin_delete on public.expenses for delete using (public.is_admin());

-- Usage (inventory usage log)
alter table if exists public.usage enable row level security;
create policy if not exists usage_read on public.usage for select using (public.is_employee());
create policy if not exists usage_admin_write on public.usage for update using (public.is_admin()) with check (public.is_admin());
create policy if not exists usage_admin_delete on public.usage for delete using (public.is_admin());

-- Inventory records (receipts/purchase log)
alter table if exists public.inventory_records enable row level security;
create policy if not exists inventory_records_read on public.inventory_records for select using (public.is_employee());
create policy if not exists inventory_records_admin_write on public.inventory_records for update using (public.is_admin()) with check (public.is_admin());
create policy if not exists inventory_records_admin_delete on public.inventory_records for delete using (public.is_admin());

-- Idempotent alterations for coupons
alter table if exists public.coupons
  add column if not exists type text check (type in ('percent','amount')),
  add column if not exists value numeric,
  add column if not exists applies_to text,
  add column if not exists usage_limit integer,
  add column if not exists active boolean default true,
  add column if not exists start timestamptz,
  add column if not exists "end" timestamptz,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

-- No public access: Anon has no policies; authenticated users must have a user record
-- Ensure authenticated users have a corresponding users row before access
create or replace function public.has_user_row()
returns boolean language sql stable as $$
  select exists(select 1 from public.users u where u.id = auth.uid());
$$;

-- Example global guard: add to select policies if you want to enforce user row presence
-- (Policies above already imply employee/admin membership through role checks.)

-- Audit Log
create table if not exists public.audit_log (
  id bigserial primary key,
  action text not null,
  actor_user_id uuid references public.users(id),
  details jsonb,
  created_at timestamptz not null default now()
);
alter table public.audit_log enable row level security;
create policy if not exists audit_admin_read on public.audit_log for select using (public.is_admin());
create policy if not exists audit_admin_write on public.audit_log for insert with check (public.is_admin());

-- Receivables (payments owed or collected)
create table if not exists public.receivables (
  id uuid primary key default gen_random_uuid(),
  amount numeric not null,
  category text,
  description text,
  date timestamptz not null default now(),
  customer_id uuid references auth.users(id),
  customer_name text,
  payment_method text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.receivables enable row level security;
-- Employees can view receivables; admins can manage all
create policy if not exists receivables_employee_select on public.receivables for select using (public.is_employee());
create policy if not exists receivables_admin_all on public.receivables for all using (public.is_admin()) with check (public.is_admin());
-- Customers can view and modify only their own receivables
create policy if not exists receivables_customer_select on public.receivables for select using (customer_id = auth.uid());
create policy if not exists receivables_customer_insert on public.receivables for insert with check (customer_id = auth.uid());
create policy if not exists receivables_customer_update on public.receivables for update using (customer_id = auth.uid()) with check (customer_id = auth.uid());

-- Index checks and additions (idempotent)
do $$ begin
  if exists (select 1 from pg_tables where schemaname='public' and tablename='customers') then
    create index if not exists customers_created_at_idx on public.customers (created_at);
    create index if not exists customers_updated_at_idx on public.customers (updated_at);
  end if;
  if exists (select 1 from pg_tables where schemaname='public' and tablename='bookings') then
    create index if not exists bookings_created_at_idx on public.bookings (created_at);
    create index if not exists bookings_updated_at_idx on public.bookings (updated_at);
  end if;
  if exists (select 1 from pg_tables where schemaname='public' and tablename='invoices') then
    create index if not exists invoices_created_at_idx on public.invoices (created_at);
  end if;
  if exists (select 1 from pg_tables where schemaname='public' and tablename='expenses') then
    create index if not exists expenses_date_idx on public.expenses (date);
  end if;
  if exists (select 1 from pg_tables where schemaname='public' and tablename='usage') then
    create index if not exists usage_date_idx on public.usage (date);
  end if;
  if exists (select 1 from pg_tables where schemaname='public' and tablename='inventory_records') then
    create index if not exists inventory_records_date_idx on public.inventory_records (date);
  end if;
end $$;

-- Payments captured via Stripe checkout webhook
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text unique,
  customer_email text,
  amount_total numeric,
  currency text,
  payment_status text,
  items jsonb,
  created_at timestamptz not null default now()
);
alter table public.payments enable row level security;
create policy if not exists payments_admin_all on public.payments for all using (public.is_admin()) with check (public.is_admin());
create policy if not exists payments_employee_select on public.payments for select using (public.is_employee());

-- Subscriptions are not used by this app. All subscription tables and policies removed.

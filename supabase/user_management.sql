-- 1. Grant Admins permission to update ANY profile (e.g., to promote users)
create policy "Admins can update any profile" on public.app_users
  for update using (
    exists (select 1 from public.app_users where id = auth.uid() and role = 'admin')
  );

-- 2. Grant Admins permission to delete profiles if necessary
create policy "Admins can delete any profile" on public.app_users
  for delete using (
    exists (select 1 from public.app_users where id = auth.uid() and role = 'admin')
  );

-- 3. Create 'authorized_users' table for pre-registering employees
-- When a user signs up with an email in this table, they automatically get the assigned role.
create table if not exists public.authorized_users (
  email text primary key,
  role text not null check (role in ('admin', 'employee')),
  name text,
  added_by uuid references public.app_users(id),
  created_at timestamptz default now()
);

-- Enable RLS on authorized_users
alter table public.authorized_users enable row level security;

-- Only Admins can view/insert/delete from authorized_users
create policy "Admins can manage authorized users" on public.authorized_users
  for all using (
    exists (select 1 from public.app_users where id = auth.uid() and role = 'admin')
  );

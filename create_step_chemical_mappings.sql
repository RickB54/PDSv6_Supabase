-- Create step_chemical_mappings table to link checklist steps to chemicals
create table if not exists public.step_chemical_mappings (
  id uuid default gen_random_uuid() primary key,
  step_id text not null,
  chemical_id uuid references public.chemical_library(id) on delete cascade,
  dilution_override text,
  tool_override text,
  application_override text,
  warnings_override text,
  include_in_prep boolean default true,
  updated_by text,
  updated_at timestamptz default now()
);

-- Policy to allow read access to everyone
create policy "Allow public read access"
  on public.step_chemical_mappings for select
  using (true);

-- Policy to allow authenticated users (Admins/Employees presumably) to insert/update
-- Assuming standard authenticated users are trusted or RLS checks role
create policy "Allow authenticated insert/update"
  on public.step_chemical_mappings for all
  using (auth.role() = 'authenticated');

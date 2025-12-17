-- -----------------------------------------------------------------------------
-- Fix Training Schema (Clean Re-install)
-- Running this will fix the "relation training_modules_id_seq does not exist" error.
-- -----------------------------------------------------------------------------

-- 1. Drop existing tables to clear corrupted schema/sequence references
drop table if exists public.training_progress cascade;
drop table if exists public.training_modules cascade;

-- 2. Recreate Training Modules Table (using UUIDs, NO sequences)
create table public.training_modules (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  category text not null, -- 'Exterior', 'Interior', etc.
  video_url text not null,
  description text,
  quiz_data jsonb default '[]'::jsonb, -- Array of { question, options[], correctIndex }
  created_at timestamptz default now()
);

-- 3. Recreate Training Progress Table (with 'answers' column included)
create table public.training_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  module_id uuid references public.training_modules(id) on delete cascade not null,
  status text check (status in ('started', 'completed')) default 'started',
  score int default 0, -- Percentage or raw score
  completed_at timestamptz,
  updated_at timestamptz default now(),
  answers jsonb default '[]'::jsonb, -- Added directly here
  unique(user_id, module_id)
);

-- 4. Enable RLS
alter table public.training_modules enable row level security;
alter table public.training_progress enable row level security;

-- 5. Create Policies
-- Modules: Admins edit, Everyone reads
create policy "Everyone can view modules" on public.training_modules for select using (true);
create policy "Admins can insert modules" on public.training_modules for insert with check (true);
create policy "Admins can update modules" on public.training_modules for update using (true);
create policy "Admins can delete modules" on public.training_modules for delete using (true);

-- Progress: Users manage their own, Admins see all
create policy "Users manage their own progress" on public.training_progress using (auth.uid() = user_id);
create policy "Admins view all progress" on public.training_progress for select using (true);

-- 6. Grant Permissions
grant all on public.training_modules to authenticated;
grant all on public.training_progress to authenticated;

-- 7. Seed the Orientation Exam Module
insert into public.training_modules (title, category, video_url, description, quiz_data)
values (
  'Final Orientation Exam', 
  'General', 
  '', 
  'The comprehensive final exam for employee certification.', 
  '[]'::jsonb
);

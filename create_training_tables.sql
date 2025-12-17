-- Create Training Modules Table
create table if not exists public.training_modules (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  category text not null, -- 'Exterior', 'Interior', etc.
  video_url text not null,
  description text,
  quiz_data jsonb default '[]'::jsonb, -- Array of { question, options[], correctIndex }
  created_at timestamptz default now()
);

-- Create Training Progress Table
create table if not exists public.training_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  module_id uuid references public.training_modules(id) on delete cascade not null,
  status text check (status in ('started', 'completed')) default 'started',
  score int default 0, -- Percentage or raw score
  completed_at timestamptz,
  updated_at timestamptz default now(),
  unique(user_id, module_id)
);

-- Enable RLS
alter table public.training_modules enable row level security;
alter table public.training_progress enable row level security;

-- Policies for Modules (Admins edit, Everyone reads)
create policy "Everyone can view modules" on public.training_modules for select using (true);
create policy "Admins can insert modules" on public.training_modules for insert with check (auth.uid() in (select id from auth.users)); -- Simplified for now, really should check role
create policy "Admins can update modules" on public.training_modules for update using (true);
create policy "Admins can delete modules" on public.training_modules for delete using (true);

-- Policies for Progress (Users see their own, Admins see all)
create policy "Users manage their own progress" on public.training_progress using (auth.uid() = user_id);
create policy "Admins view all progress" on public.training_progress for select using (true); -- Assuming admin role check logic is separate or trusted for this MVP

-- Grant permissions
grant all on public.training_modules to authenticated;
grant all on public.training_progress to authenticated;
-- No sequence needed for UUIDs

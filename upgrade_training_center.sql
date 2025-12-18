-- -----------------------------------------------------------------------------
-- Upgrade Training Center Schema
-- Adds support for: Sequential Locking, Video Progress, Safety, Badges
-- -----------------------------------------------------------------------------

-- 1. Create Badges Table
create table if not exists public.training_badges (
  id uuid default gen_random_uuid() primary key,
  title text not null unique, -- e.g. "Exterior Certified"
  description text,
  icon_name text, -- e.g. "Shield", "Award"
  color text, -- e.g. "blue", "gold"
  created_at timestamptz default now()
);

-- Enable RLS on badges
alter table public.training_badges enable row level security;
create policy "Everyone can view badges" on public.training_badges for select using (true);
create policy "Admins can manage badges" on public.training_badges for all using (auth.uid() in (select id from auth.users)); -- Simplified admin check for now

-- 2. Update Training Modules Table
-- Using `prerequisite_ids` array to allow multiple prereqs if needed, though simple linear is fine too.
alter table public.training_modules 
  add column if not exists prerequisite_ids jsonb default '[]'::jsonb, -- Array of module IDs required
  add column if not exists sop_link text, -- URL or internal link
  add column if not exists is_safety boolean default false, -- Requires acknowledgment
  add column if not exists badge_reward_id uuid references public.training_badges(id); -- Badge awarded on completion

-- 3. Update Training Progress Table
alter table public.training_progress
  add column if not exists video_position numeric default 0, -- Seconds watched
  add column if not exists acknowledged_at timestamptz; -- When safety was ack'd

-- 4. Seed Standard Badges
insert into public.training_badges (title, description, icon_name, color)
values 
  ('Exterior PRO', 'Mastery of exterior wash and decon processes.', 'Car', 'blue'),
  ('Interior PRO', 'Certified in detailed interior cleaning.', 'Armchair', 'purple'),
  ('Safety First', 'Completed all safety protocols.', 'ShieldCheck', 'red'),
  ('Prime Certified', 'Fully certified Prime Detail Solutions employee.', 'Award', 'gold')
on conflict (title) do nothing;

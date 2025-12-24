-- Create comments table for Blog Posts
create table if not exists learning_library_comments (
  id uuid default gen_random_uuid() primary key,
  post_id text references learning_library_items(id) on delete cascade not null,
  author text not null,
  avatar_url text,
  text text not null,
  created_at timestamptz default now()
);

-- Enable RLS
alter table learning_library_comments enable row level security;

-- Policies
create policy "Public read comments"
  on learning_library_comments for select
  using ( true );

create policy "Authenticated users can insert comments"
  on learning_library_comments for insert
  with check ( true );

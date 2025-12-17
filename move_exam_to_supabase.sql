-- Add answers column to training_progress if it doesn't exist
alter table public.training_progress add column if not exists answers jsonb default '[]'::jsonb;

-- Insert the Special Orientation Exam module if it doesn't exist
-- We use a known title to identify it, or we could hardcode a specific UUID but title is safer for read-ability
insert into public.training_modules (title, category, video_url, description, quiz_data)
select 
  'Final Orientation Exam', 
  'General', 
  '', -- No video for the standalone exam
  'The comprehensive final exam for employee certification.',
  '[]'::jsonb
where not exists (
  select 1 from public.training_modules where title = 'Final Orientation Exam'
);

-- Ensure RLS allows updating this specific module (Admins only)
-- The existing policy "Admins can update modules" using(true) should cover it.
-- Ensure RLS allows users to update their own progress (answers)
-- The existing policy "Users manage their own progress" covers inserts/updates where auth.uid() = user_id.



-- Add missing columns for blog reordering and pinning
ALTER TABLE public.learning_library_items 
ADD COLUMN IF NOT EXISTS sort_order INTEGER,
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_learning_library_items_sort_order ON public.learning_library_items(sort_order);
CREATE INDEX IF NOT EXISTS idx_learning_library_items_is_pinned ON public.learning_library_items(is_pinned);

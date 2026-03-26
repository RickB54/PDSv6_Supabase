-- Migration for mobile setup media
CREATE TABLE IF NOT EXISTS mobile_setup_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    url TEXT NOT NULL,
    caption TEXT,
    user_id UUID REFERENCES public.app_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.mobile_setup_media ENABLE ROW LEVEL SECURITY;

-- Policies for viewing and managing media
CREATE POLICY "Allow view for admin and employee" ON public.mobile_setup_media
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.app_users 
        WHERE id = auth.uid() AND role IN ('admin', 'employee')
    ));

CREATE POLICY "Allow all for admin" ON public.mobile_setup_media
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.app_users 
        WHERE id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Allow insert for employee" ON public.mobile_setup_media
    FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.app_users 
        WHERE id = auth.uid() AND role IN ('admin', 'employee')
    ));

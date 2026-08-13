-- Create app_updates table
CREATE TABLE IF NOT EXISTS public.app_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version TEXT NOT NULL,
    version_code INTEGER NOT NULL,
    release_notes TEXT,
    download_url TEXT NOT NULL,
    is_mandatory BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.app_updates ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read updates (so the mobile app can check on startup without being logged in)
CREATE POLICY "Allow public read access to app_updates" ON public.app_updates
    FOR SELECT USING (true);

-- Allow authenticated users to manage updates (assuming admin only can insert/update)
CREATE POLICY "Allow authenticated users to manage app_updates" ON public.app_updates
    FOR ALL USING (auth.role() = 'authenticated');

-- Create contact_messages table
CREATE TABLE IF NOT EXISTS public.contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'read', 'replied', 'archived')),
    created_at TIMESTAMPTZ DEFAULT now(),
    replied_at TIMESTAMPTZ,
    replied_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can send contact message (insert)
CREATE POLICY "Anyone can send contact message"
ON public.contact_messages FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Admins can view and manage contact messages
CREATE POLICY "Admins can manage contact messages"
ON public.contact_messages FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
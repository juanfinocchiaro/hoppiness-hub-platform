-- Drop existing table and recreate with all fields
DROP TABLE IF EXISTS public.contact_messages;

-- Create comprehensive contact_messages table
CREATE TABLE public.contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Base fields
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    subject TEXT NOT NULL CHECK (subject IN ('consulta', 'franquicia', 'empleo', 'pedidos', 'otro')),
    message TEXT,
    
    -- Franchise fields
    franchise_has_zone TEXT,
    franchise_has_location TEXT,
    franchise_investment_capital TEXT,
    
    -- Employment fields
    employment_branch_id UUID REFERENCES branches(id),
    employment_position TEXT,
    employment_cv_link TEXT,
    employment_motivation TEXT,
    
    -- Order issue fields
    order_branch_id UUID REFERENCES branches(id),
    order_number TEXT,
    order_date DATE,
    order_issue TEXT,
    
    -- Metadata
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'read', 'in_progress', 'replied', 'archived')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    assigned_to UUID REFERENCES auth.users(id),
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    read_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ,
    replied_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_contact_messages_subject ON public.contact_messages(subject);
CREATE INDEX idx_contact_messages_status ON public.contact_messages(status);
CREATE INDEX idx_contact_messages_created ON public.contact_messages(created_at DESC);

-- Enable RLS
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can send contact message
CREATE POLICY "Anyone can send contact message"
ON public.contact_messages FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Admins can manage contact messages
CREATE POLICY "Admins can manage contact messages"
ON public.contact_messages FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
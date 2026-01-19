-- Add PIN column to profiles for employee identification
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pin_hash text;

-- Create attendance tokens table for TOTP validation
CREATE TABLE public.attendance_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  used_by uuid
);

-- Enable RLS
ALTER TABLE public.attendance_tokens ENABLE ROW LEVEL SECURITY;

-- Tokens can be created by staff with branch access
CREATE POLICY "Staff can create attendance tokens"
ON public.attendance_tokens FOR INSERT
WITH CHECK (has_branch_access(auth.uid(), branch_id));

-- Anyone can read tokens (for validation)
CREATE POLICY "Anyone can validate tokens"
ON public.attendance_tokens FOR SELECT
USING (true);

-- Staff can update tokens (mark as used)
CREATE POLICY "Staff can update tokens"
ON public.attendance_tokens FOR UPDATE
USING (true)
WITH CHECK (true);

-- Index for fast token lookup
CREATE INDEX idx_attendance_tokens_token ON public.attendance_tokens(token);
CREATE INDEX idx_attendance_tokens_expires ON public.attendance_tokens(expires_at);

-- Function to clean up expired tokens (can be called periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.attendance_tokens WHERE expires_at < now() - interval '1 hour';
END;
$$;
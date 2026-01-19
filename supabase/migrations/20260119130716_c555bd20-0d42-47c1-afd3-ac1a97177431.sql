-- Create permission audit log table
CREATE TABLE public.permission_audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    target_user_id uuid NOT NULL,
    action text NOT NULL CHECK (action IN ('grant', 'revoke', 'bulk_grant', 'bulk_revoke')),
    permission_keys text[] NOT NULL,
    reason text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.permission_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.permission_audit_logs
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Only admins can insert audit logs
CREATE POLICY "Admins can insert audit logs"
ON public.permission_audit_logs
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

-- Create index for efficient queries
CREATE INDEX idx_permission_audit_target_user ON public.permission_audit_logs(target_user_id);
CREATE INDEX idx_permission_audit_branch ON public.permission_audit_logs(branch_id);
CREATE INDEX idx_permission_audit_created ON public.permission_audit_logs(created_at DESC);
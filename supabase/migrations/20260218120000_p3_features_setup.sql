-- =============================================
-- MIGRACIÓN: Soporte para features P3
-- - Nuevo brand_role: community_manager
-- - Tabla push_subscriptions
-- - Triggers de auditoría en tablas críticas
-- =============================================

-- 1. Agregar 'community_manager' al enum brand_role_type
ALTER TYPE public.brand_role_type ADD VALUE IF NOT EXISTS 'community_manager';

-- 2. Tabla push_subscriptions para notificaciones push (Web Push API)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  keys jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push subscriptions"
  ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_push_subscriptions_user ON public.push_subscriptions(user_id);

-- 3. Tabla de auditoría (si no existe)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admins view audit" ON public.audit_logs;
CREATE POLICY "Only admins view audit" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles_v2
      WHERE user_id = auth.uid()
      AND brand_role = 'superadmin'
      AND is_active = true
    )
  );

-- 4. Función de auditoría
CREATE OR REPLACE FUNCTION public.log_sensitive_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, new_data, created_at)
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text),
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN row_to_json(OLD)::jsonb END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN row_to_json(NEW)::jsonb END,
    now()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 5. Triggers de auditoría en tablas críticas

-- gastos
DROP TRIGGER IF EXISTS audit_gastos ON public.gastos;
CREATE TRIGGER audit_gastos
  AFTER INSERT OR UPDATE OR DELETE ON public.gastos
  FOR EACH ROW EXECUTE FUNCTION log_sensitive_access();

-- salary_advances
DROP TRIGGER IF EXISTS audit_salary_advances ON public.salary_advances;
CREATE TRIGGER audit_salary_advances
  AFTER INSERT OR UPDATE OR DELETE ON public.salary_advances
  FOR EACH ROW EXECUTE FUNCTION log_sensitive_access();

-- shift_closures
DROP TRIGGER IF EXISTS audit_shift_closures ON public.shift_closures;
CREATE TRIGGER audit_shift_closures
  AFTER INSERT OR UPDATE OR DELETE ON public.shift_closures
  FOR EACH ROW EXECUTE FUNCTION log_sensitive_access();

-- communications
DROP TRIGGER IF EXISTS audit_communications ON public.communications;
CREATE TRIGGER audit_communications
  AFTER INSERT OR UPDATE OR DELETE ON public.communications
  FOR EACH ROW EXECUTE FUNCTION log_sensitive_access();

-- user_branch_roles
DROP TRIGGER IF EXISTS audit_user_branch_roles ON public.user_branch_roles;
CREATE TRIGGER audit_user_branch_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_branch_roles
  FOR EACH ROW EXECUTE FUNCTION log_sensitive_access();

-- branches
DROP TRIGGER IF EXISTS audit_branches ON public.branches;
CREATE TRIGGER audit_branches
  AFTER INSERT OR UPDATE OR DELETE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION log_sensitive_access();

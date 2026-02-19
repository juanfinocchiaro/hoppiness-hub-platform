
-- MIGRACIÓN DE SEGURIDAD - HOPPINESS HUB (Simplificada)

-- 1. Vista pública segura de branches (sin API keys)
DROP VIEW IF EXISTS public.branches_public;
CREATE VIEW public.branches_public AS
SELECT id, name, address, city, slug, phone, email, latitude, longitude,
  opening_time, closing_time, delivery_enabled, takeaway_enabled, dine_in_enabled,
  estimated_prep_time_min, is_active, is_open, local_open_state,
  rappi_enabled, pedidosya_enabled, mercadopago_delivery_enabled
FROM public.branches WHERE is_active = true;

GRANT SELECT ON public.branches_public TO anon, authenticated;

-- 2. Función para datos sensibles de branches
CREATE OR REPLACE FUNCTION public.get_branch_sensitive_data(p_branch_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (is_superadmin(auth.uid()) OR EXISTS (
    SELECT 1 FROM user_roles_v2 WHERE user_id = auth.uid() AND is_active = true
    AND (brand_role IN ('superadmin', 'coordinador') OR (local_role = 'franquiciado' AND p_branch_id = ANY(branch_ids)))
  )) THEN RETURN NULL; END IF;
  RETURN (SELECT jsonb_build_object(
    'mercadopago_access_token', mercadopago_access_token, 'rappi_api_key', rappi_api_key,
    'pedidosya_api_key', pedidosya_api_key, 'webhook_api_key', webhook_api_key,
    'facturante_api_key', facturante_api_key, 'expense_pin_threshold', expense_pin_threshold
  ) FROM branches WHERE id = p_branch_id);
END; $$;

-- 3. Tabla de auditoría
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid, action text NOT NULL, table_name text NOT NULL,
  record_id text, old_data jsonb, new_data jsonb, ip_address text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Only admins view audit" ON public.audit_logs;
CREATE POLICY "Only admins view audit" ON public.audit_logs FOR SELECT TO authenticated
USING (is_superadmin(auth.uid()));

-- 4. Función de auditoría
CREATE OR REPLACE FUNCTION public.log_sensitive_access() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, new_data, created_at)
  VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, COALESCE(NEW.id::text, OLD.id::text),
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN row_to_json(OLD)::jsonb END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN row_to_json(NEW)::jsonb END, now());
  RETURN COALESCE(NEW, OLD);
END; $$;

-- 5. Trigger en user_roles_v2
DROP TRIGGER IF EXISTS audit_user_roles_v2 ON public.user_roles_v2;
CREATE TRIGGER audit_user_roles_v2 AFTER INSERT OR UPDATE OR DELETE ON public.user_roles_v2
FOR EACH ROW EXECUTE FUNCTION log_sensitive_access();

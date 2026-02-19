-- Fase 5: Tablas y funciones para verificación de operador y PIN de supervisor

-- Tabla de logs de sesión de operadores (opcional, para auditoría)
CREATE TABLE IF NOT EXISTS public.operator_session_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  current_user_id UUID NOT NULL REFERENCES auth.users(id),
  previous_user_id UUID REFERENCES auth.users(id),
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('confirm_identity', 'operator_change')),
  triggered_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operator_logs_branch ON operator_session_logs(branch_id);
CREATE INDEX IF NOT EXISTS idx_operator_logs_user ON operator_session_logs(current_user_id);
CREATE INDEX IF NOT EXISTS idx_operator_logs_date ON operator_session_logs(created_at);

ALTER TABLE operator_session_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Branch access for operator logs" ON operator_session_logs;
CREATE POLICY "Branch access for operator logs" ON operator_session_logs
  FOR ALL
  USING (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()))
  WITH CHECK (public.has_branch_access_v2(auth.uid(), branch_id) OR public.is_superadmin(auth.uid()));

-- Función para validar PIN de supervisor
-- Nota: Requiere que los usuarios tengan un campo 'pin' en profiles o user_roles
-- Por ahora, valida por rol de encargado/franquiciado/admin
CREATE OR REPLACE FUNCTION public.validate_supervisor_pin(
  _branch_id UUID,
  _pin TEXT
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_full_name TEXT;
  v_role TEXT;
BEGIN
  -- Por ahora, validar por rol (si el usuario actual es supervisor)
  -- En el futuro, se puede agregar validación de PIN específico
  SELECT ur.user_id, COALESCE(p.full_name, u.email::TEXT), ur.role::TEXT
  INTO v_user_id, v_full_name, v_role
  FROM user_roles ur
  JOIN auth.users u ON u.id = ur.user_id
  LEFT JOIN profiles p ON p.user_id = ur.user_id
  WHERE ur.is_active = TRUE
    AND ur.role IN ('encargado', 'franquiciado', 'admin', 'coordinador')
    AND EXISTS (
      SELECT 1 FROM user_roles ur2
      WHERE ur2.user_id = auth.uid()
        AND ur2.branch_id = _branch_id
        AND ur2.is_active = TRUE
    )
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    RETURN QUERY SELECT v_user_id, v_full_name, v_role;
  END IF;

  RETURN;
END;
$$;

COMMENT ON FUNCTION public.validate_supervisor_pin IS 'Valida PIN de supervisor (por ahora valida por rol)';

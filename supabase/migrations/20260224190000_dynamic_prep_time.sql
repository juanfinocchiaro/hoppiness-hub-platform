-- Dynamic prep time RPC: adjusts estimated time based on active order queue
CREATE OR REPLACE FUNCTION get_dynamic_prep_time(
  p_branch_id UUID,
  p_tipo_servicio TEXT DEFAULT 'delivery'
)
RETURNS TABLE(
  prep_time_min INT,
  active_orders INT,
  base_prep_time INT
) AS $$
DECLARE
  v_active_count INT;
  v_base_time INT;
  v_extra_per_order INT := 3;
  v_max_extra INT := 30;
BEGIN
  SELECT COUNT(*) INTO v_active_count
  FROM pedidos p
  WHERE p.branch_id = p_branch_id
    AND p.estado IN ('pendiente','confirmado','en_preparacion')
    AND p.deleted_at IS NULL;

  SELECT COALESCE(
    CASE WHEN p_tipo_servicio = 'delivery' THEN wc.prep_time_delivery
         ELSE wc.prep_time_retiro END,
    CASE WHEN p_tipo_servicio = 'delivery' THEN 40 ELSE 15 END
  ) INTO v_base_time
  FROM webapp_config wc WHERE wc.branch_id = p_branch_id;

  IF v_base_time IS NULL THEN
    v_base_time := CASE WHEN p_tipo_servicio = 'delivery' THEN 40 ELSE 15 END;
  END IF;

  RETURN QUERY SELECT
    (v_base_time + LEAST(v_active_count * v_extra_per_order, v_max_extra))::INT,
    v_active_count::INT,
    v_base_time::INT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

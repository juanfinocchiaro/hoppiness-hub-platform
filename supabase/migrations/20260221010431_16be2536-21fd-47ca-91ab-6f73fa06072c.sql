CREATE OR REPLACE FUNCTION public.generar_numero_pedido(p_branch_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_numero INTEGER;
BEGIN
  SELECT COALESCE(MAX(numero_pedido), 0) + 1 INTO v_numero
  FROM pedidos
  WHERE branch_id = p_branch_id;
  RETURN v_numero;
END;
$$;
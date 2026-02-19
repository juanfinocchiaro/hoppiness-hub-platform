
CREATE OR REPLACE FUNCTION public.obtener_proximo_numero_factura(
  _branch_id UUID, _tipo TEXT
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_campo TEXT; v_numero INTEGER;
BEGIN
  IF lower(_tipo) NOT IN ('a', 'b', 'c') THEN
    RAISE EXCEPTION 'Tipo de factura inválido: %', _tipo;
  END IF;

  v_campo := 'ultimo_nro_factura_' || lower(_tipo);
  
  EXECUTE format(
    'UPDATE afip_config SET %I = COALESCE(%I, 0) + 1 WHERE branch_id = $1 RETURNING %I',
    v_campo, v_campo, v_campo
  ) INTO v_numero USING _branch_id;
  
  IF v_numero IS NULL THEN
    RAISE EXCEPTION 'No se encontró configuración ARCA para branch_id: %', _branch_id;
  END IF;

  RETURN v_numero;
END;
$$;

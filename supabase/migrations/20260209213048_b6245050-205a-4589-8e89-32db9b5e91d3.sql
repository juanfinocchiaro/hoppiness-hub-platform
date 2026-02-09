
-- Fix the sync_factura_to_canon function to use correct estado value
CREATE OR REPLACE FUNCTION public.sync_factura_to_canon()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.proveedor_id != '00000000-0000-0000-0000-000000000001' THEN
    RETURN NEW;
  END IF;

  UPDATE canon_liquidaciones
  SET saldo_pendiente = NEW.saldo_pendiente,
      estado = CASE
        WHEN NEW.saldo_pendiente <= 0 THEN 'pagado'
        WHEN NEW.saldo_pendiente < NEW.total THEN 'pagado_parcial'
        ELSE 'pendiente'
      END,
      updated_at = now()
  WHERE branch_id = NEW.branch_id
    AND periodo = NEW.periodo
    AND deleted_at IS NULL;

  RETURN NEW;
END;
$function$;

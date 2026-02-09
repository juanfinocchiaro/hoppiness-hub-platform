-- Crear trigger para auto-generar factura de canon cuando se insertan o actualizan ventas mensuales
CREATE TRIGGER trg_generar_factura_canon
AFTER INSERT OR UPDATE ON public.ventas_mensuales_local
FOR EACH ROW
EXECUTE FUNCTION public.generar_factura_canon();
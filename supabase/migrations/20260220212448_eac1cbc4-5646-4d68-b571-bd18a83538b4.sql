
-- Reglas de facturación configurables por local
ALTER TABLE public.afip_config
  ADD COLUMN IF NOT EXISTS reglas_facturacion JSONB NOT NULL DEFAULT '{
    "canales_internos": {
      "efectivo": false,
      "debito": true,
      "credito": true,
      "qr": true,
      "transferencia": true
    },
    "canales_externos": {
      "rappi": true,
      "pedidosya": true,
      "mas_delivery_efectivo": false,
      "mas_delivery_digital": true,
      "mp_delivery": true
    }
  }'::jsonb;

COMMENT ON COLUMN public.afip_config.reglas_facturacion IS 
  'Configura qué se factura por canal y método de pago. canales_internos aplica a salón, takeaway y delivery propio. canales_externos aplica a apps de terceros.';

-- Fix invoice_type constraint: allow Factura B (UI supports A/B)

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_invoice_type_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_invoice_type_check
  CHECK (
    invoice_type = ANY (ARRAY[
      'consumidor_final'::text,
      'factura_a'::text,
      'factura_b'::text
    ])
  );
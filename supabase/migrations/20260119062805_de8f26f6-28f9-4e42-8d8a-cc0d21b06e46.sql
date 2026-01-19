-- Add invoice_type column to orders table
ALTER TABLE public.orders 
ADD COLUMN invoice_type TEXT NOT NULL DEFAULT 'consumidor_final' 
CHECK (invoice_type IN ('consumidor_final', 'factura_a'));

-- Add customer_cuit for Factura A
ALTER TABLE public.orders 
ADD COLUMN customer_cuit TEXT;

-- Add customer_business_name for Factura A
ALTER TABLE public.orders 
ADD COLUMN customer_business_name TEXT;

COMMENT ON COLUMN public.orders.invoice_type IS 'Type of invoice: consumidor_final or factura_a';
COMMENT ON COLUMN public.orders.customer_cuit IS 'CUIT for Factura A invoices';
COMMENT ON COLUMN public.orders.customer_business_name IS 'Business name for Factura A invoices';
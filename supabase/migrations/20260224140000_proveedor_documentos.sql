-- Support PDF attachments for suppliers and purchase invoices

-- Table for supplier-level documents (contracts, price lists, etc.)
CREATE TABLE IF NOT EXISTS public.proveedor_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id uuid NOT NULL REFERENCES public.proveedores(id) ON DELETE CASCADE,
  nombre_archivo text NOT NULL,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  tipo text DEFAULT 'general',
  file_size_bytes integer,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_proveedor_documentos_proveedor
  ON public.proveedor_documentos(proveedor_id) WHERE deleted_at IS NULL;

-- Add PDF attachment column to facturas_proveedores (purchase invoices)
ALTER TABLE public.facturas_proveedores
  ADD COLUMN IF NOT EXISTS factura_pdf_url text;

COMMENT ON TABLE public.proveedor_documentos IS
  'PDF documents attached to suppliers (contracts, price lists, certificates)';
COMMENT ON COLUMN public.facturas_proveedores.factura_pdf_url IS
  'URL to the attached PDF of the purchase invoice';

-- RLS policies
ALTER TABLE public.proveedor_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_select_proveedor_docs"
  ON public.proveedor_documentos FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "authenticated_insert_proveedor_docs"
  ON public.proveedor_documentos FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated_update_proveedor_docs"
  ON public.proveedor_documentos FOR UPDATE TO authenticated
  USING (true);

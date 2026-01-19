-- Table for scanned invoices/receipts
CREATE TABLE public.scanned_documents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    branch_id UUID REFERENCES public.branches(id),
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    document_type TEXT, -- 'factura', 'ticket', 'remito', 'recibo', 'otro'
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'error'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id)
);

-- Table for extracted invoice data
CREATE TABLE public.extracted_invoices (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES public.scanned_documents(id) ON DELETE CASCADE,
    
    -- Supplier info
    supplier_name TEXT,
    supplier_cuit TEXT,
    supplier_address TEXT,
    supplier_iva_condition TEXT,
    
    -- Invoice info
    invoice_type TEXT, -- 'A', 'B', 'C', 'X', 'Ticket', 'Remito'
    invoice_number TEXT,
    invoice_date DATE,
    due_date DATE,
    
    -- Payment info
    payment_method TEXT,
    payment_condition TEXT, -- 'Contado', 'Cuenta Corriente', '30 días', etc.
    
    -- Amounts
    subtotal NUMERIC(12,2),
    iva_amount NUMERIC(12,2),
    other_taxes NUMERIC(12,2),
    total NUMERIC(12,2),
    currency TEXT DEFAULT 'ARS',
    
    -- Metadata
    notes TEXT,
    raw_extracted_data JSONB, -- Store full AI response for debugging
    confidence_score NUMERIC(3,2), -- 0.00 to 1.00
    
    -- Review status
    is_reviewed BOOLEAN DEFAULT false,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for extracted line items
CREATE TABLE public.extracted_invoice_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID NOT NULL REFERENCES public.extracted_invoices(id) ON DELETE CASCADE,
    
    description TEXT NOT NULL,
    quantity NUMERIC(10,3),
    unit TEXT,
    unit_price NUMERIC(12,2),
    discount_percent NUMERIC(5,2),
    subtotal NUMERIC(12,2),
    iva_rate NUMERIC(5,2), -- 21%, 10.5%, 0%
    
    -- Link to existing ingredient if matched
    matched_ingredient_id UUID REFERENCES public.ingredients(id),
    matched_product_id UUID REFERENCES public.products(id),
    
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scanned_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracted_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracted_invoice_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for scanned_documents
CREATE POLICY "Admins and coordinators can manage all documents"
ON public.scanned_documents FOR ALL
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'coordinador'));

CREATE POLICY "Branch users can view their branch documents"
ON public.scanned_documents FOR SELECT
USING (public.has_branch_access(auth.uid(), branch_id));

-- RLS policies for extracted_invoices
CREATE POLICY "Admins and coordinators can manage all invoices"
ON public.extracted_invoices FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.scanned_documents sd 
        WHERE sd.id = document_id 
        AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'coordinador'))
    )
);

CREATE POLICY "Branch users can view their branch invoices"
ON public.extracted_invoices FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.scanned_documents sd 
        WHERE sd.id = document_id 
        AND public.has_branch_access(auth.uid(), sd.branch_id)
    )
);

-- RLS policies for extracted_invoice_items
CREATE POLICY "Admins and coordinators can manage all items"
ON public.extracted_invoice_items FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.extracted_invoices ei
        JOIN public.scanned_documents sd ON sd.id = ei.document_id
        WHERE ei.id = invoice_id 
        AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'coordinador'))
    )
);

CREATE POLICY "Branch users can view their branch items"
ON public.extracted_invoice_items FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.extracted_invoices ei
        JOIN public.scanned_documents sd ON sd.id = ei.document_id
        WHERE ei.id = invoice_id 
        AND public.has_branch_access(auth.uid(), sd.branch_id)
    )
);

-- Trigger to update updated_at
CREATE TRIGGER update_extracted_invoices_updated_at
BEFORE UPDATE ON public.extracted_invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster lookups
CREATE INDEX idx_scanned_documents_status ON public.scanned_documents(status);
CREATE INDEX idx_scanned_documents_branch ON public.scanned_documents(branch_id);
CREATE INDEX idx_extracted_invoices_document ON public.extracted_invoices(document_id);
CREATE INDEX idx_extracted_invoices_supplier ON public.extracted_invoices(supplier_name);
CREATE INDEX idx_extracted_invoice_items_invoice ON public.extracted_invoice_items(invoice_id);
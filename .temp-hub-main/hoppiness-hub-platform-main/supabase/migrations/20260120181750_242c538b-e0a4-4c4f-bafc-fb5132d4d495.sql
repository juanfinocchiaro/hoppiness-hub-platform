-- Tabla para facturas de proveedores
CREATE TABLE public.supplier_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES public.branches(id),
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
    
    -- Datos del comprobante
    invoice_type TEXT NOT NULL CHECK (invoice_type IN ('factura_a', 'factura_b', 'factura_c', 'ticket', 'remito', 'otro')),
    invoice_number TEXT,
    invoice_date DATE NOT NULL,
    due_date DATE,
    
    -- Montos
    subtotal DECIMAL(12,2),
    tax_amount DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) NOT NULL,
    
    -- Pago
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid')),
    paid_amount DECIMAL(12,2) DEFAULT 0,
    payment_method TEXT,
    paid_at TIMESTAMPTZ,
    
    -- Archivo adjunto
    attachment_url TEXT,
    attachment_name TEXT,
    
    -- Metadata
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla para items de factura
CREATE TABLE public.supplier_invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.supplier_invoices(id) ON DELETE CASCADE,
    ingredient_id UUID REFERENCES public.ingredients(id),
    description TEXT,
    quantity DECIMAL(10,3) NOT NULL,
    unit TEXT,
    unit_price DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla para pedidos a proveedores
CREATE TABLE public.supplier_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES public.branches(id),
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
    
    -- Estado
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'confirmed', 'received', 'cancelled')),
    
    -- Items del pedido (JSON array)
    items JSONB NOT NULL DEFAULT '[]',
    
    -- Notas
    notes TEXT,
    
    -- Seguimiento
    sent_at TIMESTAMPTZ,
    sent_via TEXT,
    confirmed_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ,
    
    -- Vinculación con factura cuando llega
    invoice_id UUID REFERENCES public.supplier_invoices(id),
    
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Agregar campo WhatsApp a suppliers si no existe
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- Agregar campos a user_roles para control de fichajes
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS requires_attendance BOOLEAN DEFAULT false;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS attendance_pin TEXT;

-- Índices para performance
CREATE INDEX idx_supplier_invoices_branch ON public.supplier_invoices(branch_id);
CREATE INDEX idx_supplier_invoices_supplier ON public.supplier_invoices(supplier_id);
CREATE INDEX idx_supplier_invoices_status ON public.supplier_invoices(status);
CREATE INDEX idx_supplier_invoices_due_date ON public.supplier_invoices(due_date);
CREATE INDEX idx_supplier_invoice_items_invoice ON public.supplier_invoice_items(invoice_id);
CREATE INDEX idx_supplier_orders_branch ON public.supplier_orders(branch_id);
CREATE INDEX idx_supplier_orders_supplier ON public.supplier_orders(supplier_id);
CREATE INDEX idx_supplier_orders_status ON public.supplier_orders(status);

-- Habilitar RLS
ALTER TABLE public.supplier_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_orders ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para supplier_invoices
CREATE POLICY "Users can view supplier invoices for their branches"
ON public.supplier_invoices FOR SELECT TO authenticated
USING (
    branch_id IN (
        SELECT branch_id FROM public.user_roles
        WHERE user_id = auth.uid() AND is_active = true
    )
);

CREATE POLICY "Users can insert supplier invoices for their branches"
ON public.supplier_invoices FOR INSERT TO authenticated
WITH CHECK (
    branch_id IN (
        SELECT branch_id FROM public.user_roles
        WHERE user_id = auth.uid() 
        AND role IN ('franquiciado', 'encargado', 'admin')
        AND is_active = true
    )
);

CREATE POLICY "Users can update supplier invoices for their branches"
ON public.supplier_invoices FOR UPDATE TO authenticated
USING (
    branch_id IN (
        SELECT branch_id FROM public.user_roles
        WHERE user_id = auth.uid() 
        AND role IN ('franquiciado', 'encargado', 'admin')
        AND is_active = true
    )
);

CREATE POLICY "Users can delete supplier invoices for their branches"
ON public.supplier_invoices FOR DELETE TO authenticated
USING (
    branch_id IN (
        SELECT branch_id FROM public.user_roles
        WHERE user_id = auth.uid() 
        AND role IN ('franquiciado', 'encargado', 'admin')
        AND is_active = true
    )
);

-- Políticas RLS para supplier_invoice_items
CREATE POLICY "Users can view invoice items"
ON public.supplier_invoice_items FOR SELECT TO authenticated
USING (
    invoice_id IN (
        SELECT id FROM public.supplier_invoices WHERE branch_id IN (
            SELECT branch_id FROM public.user_roles
            WHERE user_id = auth.uid() AND is_active = true
        )
    )
);

CREATE POLICY "Users can manage invoice items"
ON public.supplier_invoice_items FOR ALL TO authenticated
USING (
    invoice_id IN (
        SELECT id FROM public.supplier_invoices WHERE branch_id IN (
            SELECT branch_id FROM public.user_roles
            WHERE user_id = auth.uid() 
            AND role IN ('franquiciado', 'encargado', 'admin')
            AND is_active = true
        )
    )
);

-- Políticas RLS para supplier_orders
CREATE POLICY "Users can view supplier orders for their branches"
ON public.supplier_orders FOR SELECT TO authenticated
USING (
    branch_id IN (
        SELECT branch_id FROM public.user_roles
        WHERE user_id = auth.uid() AND is_active = true
    )
);

CREATE POLICY "Users can insert supplier orders for their branches"
ON public.supplier_orders FOR INSERT TO authenticated
WITH CHECK (
    branch_id IN (
        SELECT branch_id FROM public.user_roles
        WHERE user_id = auth.uid() 
        AND role IN ('franquiciado', 'encargado', 'admin')
        AND is_active = true
    )
);

CREATE POLICY "Users can update supplier orders for their branches"
ON public.supplier_orders FOR UPDATE TO authenticated
USING (
    branch_id IN (
        SELECT branch_id FROM public.user_roles
        WHERE user_id = auth.uid() 
        AND role IN ('franquiciado', 'encargado', 'admin')
        AND is_active = true
    )
);

CREATE POLICY "Users can delete supplier orders for their branches"
ON public.supplier_orders FOR DELETE TO authenticated
USING (
    branch_id IN (
        SELECT branch_id FROM public.user_roles
        WHERE user_id = auth.uid() 
        AND role IN ('franquiciado', 'encargado', 'admin')
        AND is_active = true
    )
);

-- Trigger para updated_at
CREATE TRIGGER update_supplier_invoices_updated_at
    BEFORE UPDATE ON public.supplier_invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_supplier_orders_updated_at
    BEFORE UPDATE ON public.supplier_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
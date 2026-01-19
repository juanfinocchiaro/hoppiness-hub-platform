-- =============================================
-- HOPPINESS CLUB - ERP/Accounting Module
-- Dual Reality Accounting System (Fiscal vs Managerial)
-- =============================================

-- Enum for receipt types (Fiscal vs Internal)
CREATE TYPE public.receipt_type AS ENUM ('OFFICIAL', 'INTERNAL');

-- Enum for transaction payment origin/destination
CREATE TYPE public.payment_origin AS ENUM ('cash', 'mercadopago', 'bank_transfer', 'credit_card');

-- Categories table for transactions
CREATE TABLE public.transaction_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    parent_id UUID REFERENCES public.transaction_categories(id) ON DELETE SET NULL,
    category_group TEXT NOT NULL, -- 'INGRESOS', 'CMV', 'GASTOS_OPERATIVOS', 'RRHH', 'ESTRUCTURA', 'IMPUESTOS'
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Financial transactions table (core of the ERP)
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    type transaction_type NOT NULL, -- Uses existing 'income' | 'expense' enum
    category_id UUID REFERENCES public.transaction_categories(id),
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    receipt_type receipt_type NOT NULL DEFAULT 'INTERNAL',
    tax_percentage DECIMAL(5,2), -- Only for OFFICIAL (10.5, 21, etc.)
    payment_origin payment_origin NOT NULL DEFAULT 'cash',
    concept TEXT NOT NULL,
    notes TEXT,
    receipt_number TEXT, -- Factura number if OFFICIAL
    recorded_by UUID REFERENCES auth.users(id),
    is_payment_to_supplier BOOLEAN DEFAULT false, -- Distinguishes purchase vs payment
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Supplier payments tracking (for current account/balance)
CREATE TABLE public.supplier_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    amount DECIMAL(12,2) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_origin payment_origin NOT NULL DEFAULT 'cash',
    notes TEXT,
    recorded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- View for supplier balances (debt calculation)
CREATE OR REPLACE VIEW public.supplier_balances AS
SELECT 
    s.id AS supplier_id,
    s.name AS supplier_name,
    b.id AS branch_id,
    b.name AS branch_name,
    COALESCE(SUM(CASE WHEN t.type = 'expense' AND t.supplier_id = s.id AND NOT COALESCE(t.is_payment_to_supplier, false) THEN t.amount ELSE 0 END), 0) AS total_purchased,
    COALESCE(SUM(CASE WHEN sp.supplier_id = s.id THEN sp.amount ELSE 0 END), 0) AS total_paid,
    COALESCE(SUM(CASE WHEN t.type = 'expense' AND t.supplier_id = s.id AND NOT COALESCE(t.is_payment_to_supplier, false) THEN t.amount ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN sp.supplier_id = s.id THEN sp.amount ELSE 0 END), 0) AS current_balance
FROM public.suppliers s
CROSS JOIN public.branches b
LEFT JOIN public.transactions t ON t.supplier_id = s.id AND t.branch_id = b.id
LEFT JOIN public.supplier_payments sp ON sp.supplier_id = s.id AND sp.branch_id = b.id
WHERE s.is_active = true
GROUP BY s.id, s.name, b.id, b.name;

-- Enable RLS
ALTER TABLE public.transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transaction_categories
CREATE POLICY "Anyone can view active categories"
ON public.transaction_categories FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage categories"
ON public.transaction_categories FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- RLS Policies for transactions
CREATE POLICY "Staff can view branch transactions"
ON public.transactions FOR SELECT
USING (has_branch_access(auth.uid(), branch_id));

CREATE POLICY "Staff can create transactions"
ON public.transactions FOR INSERT
WITH CHECK (has_branch_access(auth.uid(), branch_id));

CREATE POLICY "Staff can update branch transactions"
ON public.transactions FOR UPDATE
USING (has_branch_access(auth.uid(), branch_id))
WITH CHECK (has_branch_access(auth.uid(), branch_id));

CREATE POLICY "Admins can delete transactions"
ON public.transactions FOR DELETE
USING (is_admin(auth.uid()));

-- RLS Policies for supplier_payments
CREATE POLICY "Staff can view branch supplier payments"
ON public.supplier_payments FOR SELECT
USING (has_branch_access(auth.uid(), branch_id));

CREATE POLICY "Staff can create supplier payments"
ON public.supplier_payments FOR INSERT
WITH CHECK (has_branch_access(auth.uid(), branch_id));

CREATE POLICY "Admins can manage supplier payments"
ON public.supplier_payments FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories based on the P&L structure
INSERT INTO public.transaction_categories (name, category_group, display_order) VALUES
-- INGRESOS
('Ventas Salón', 'INGRESOS', 1),
('Ventas Takeaway', 'INGRESOS', 2),
('Ventas Rappi', 'INGRESOS', 3),
('Ventas PedidosYa', 'INGRESOS', 4),
('Ventas MercadoPago Delivery', 'INGRESOS', 5),
('Otros Ingresos', 'INGRESOS', 6),
-- CMV (Costo Mercadería Vendida)
('Carnes', 'CMV', 10),
('Pan y Panificados', 'CMV', 11),
('Verduras y Vegetales', 'CMV', 12),
('Lácteos', 'CMV', 13),
('Bebidas (Insumo)', 'CMV', 14),
('Condimentos y Salsas', 'CMV', 15),
('Otros Alimentos', 'CMV', 16),
-- GASTOS OPERATIVOS
('Descartables', 'GASTOS_OPERATIVOS', 20),
('Limpieza', 'GASTOS_OPERATIVOS', 21),
('Mantenimiento', 'GASTOS_OPERATIVOS', 22),
('Packaging', 'GASTOS_OPERATIVOS', 23),
('Insumos Operativos', 'GASTOS_OPERATIVOS', 24),
-- RRHH
('Sueldos', 'RRHH', 30),
('Jornales', 'RRHH', 31),
('Cargas Sociales', 'RRHH', 32),
('Comida Personal', 'RRHH', 33),
('Uniformes', 'RRHH', 34),
-- ESTRUCTURA Y LOGÍSTICA
('Alquiler', 'ESTRUCTURA', 40),
('Luz', 'ESTRUCTURA', 41),
('Gas', 'ESTRUCTURA', 42),
('Agua', 'ESTRUCTURA', 43),
('Internet', 'ESTRUCTURA', 44),
('Teléfono', 'ESTRUCTURA', 45),
('Seguros', 'ESTRUCTURA', 46),
('Comisiones Apps', 'ESTRUCTURA', 47),
('Logística/Delivery', 'ESTRUCTURA', 48),
('Expensas', 'ESTRUCTURA', 49),
-- IMPUESTOS Y FINANCIERO
('IIBB', 'IMPUESTOS', 50),
('Monotributo', 'IMPUESTOS', 51),
('IVA', 'IMPUESTOS', 52),
('Ganancias', 'IMPUESTOS', 53),
('Tasas Municipales', 'IMPUESTOS', 54),
('Intereses Bancarios', 'IMPUESTOS', 55),
('Comisiones Bancarias', 'IMPUESTOS', 56),
('Comisiones MercadoPago', 'IMPUESTOS', 57);
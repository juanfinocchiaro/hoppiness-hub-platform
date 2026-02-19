-- Fix: Drop and recreate view without SECURITY DEFINER
-- The view will now use the permissions of the querying user (safer)
DROP VIEW IF EXISTS public.supplier_balances;

CREATE VIEW public.supplier_balances 
WITH (security_invoker = true)
AS
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
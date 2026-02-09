
-- Fix: recreate view with security_invoker = true
DROP VIEW IF EXISTS rdo_report_data;
CREATE VIEW rdo_report_data WITH (security_invoker = true) AS
SELECT branch_id, periodo, rdo_category_code, SUM(monto) as total
FROM rdo_movimientos WHERE deleted_at IS NULL GROUP BY branch_id, periodo, rdo_category_code;

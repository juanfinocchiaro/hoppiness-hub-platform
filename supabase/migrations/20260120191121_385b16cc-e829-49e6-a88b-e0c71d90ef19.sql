-- Agregar ON DELETE CASCADE o SET NULL a las foreign keys que bloquean la eliminación de sucursales

-- contact_messages: SET NULL (no eliminar mensajes, solo desvinvular)
ALTER TABLE public.contact_messages 
  DROP CONSTRAINT IF EXISTS contact_messages_employment_branch_id_fkey,
  ADD CONSTRAINT contact_messages_employment_branch_id_fkey 
    FOREIGN KEY (employment_branch_id) REFERENCES branches(id) ON DELETE SET NULL;

ALTER TABLE public.contact_messages 
  DROP CONSTRAINT IF EXISTS contact_messages_order_branch_id_fkey,
  ADD CONSTRAINT contact_messages_order_branch_id_fkey 
    FOREIGN KEY (order_branch_id) REFERENCES branches(id) ON DELETE SET NULL;

-- customers: SET NULL (no eliminar clientes, solo desvinvular su sucursal preferida)
ALTER TABLE public.customers 
  DROP CONSTRAINT IF EXISTS customers_preferred_branch_id_fkey,
  ADD CONSTRAINT customers_preferred_branch_id_fkey 
    FOREIGN KEY (preferred_branch_id) REFERENCES branches(id) ON DELETE SET NULL;

-- finance_accounts: CASCADE (eliminar cuentas de la sucursal)
ALTER TABLE public.finance_accounts 
  DROP CONSTRAINT IF EXISTS finance_accounts_branch_id_fkey,
  ADD CONSTRAINT finance_accounts_branch_id_fkey 
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE;

-- loans: SET NULL (mantener registro de préstamos)
ALTER TABLE public.loans 
  DROP CONSTRAINT IF EXISTS loans_branch_id_fkey,
  ADD CONSTRAINT loans_branch_id_fkey 
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL;

-- orders: CASCADE (eliminar pedidos de la sucursal)
ALTER TABLE public.orders 
  DROP CONSTRAINT IF EXISTS orders_branch_id_fkey,
  ADD CONSTRAINT orders_branch_id_fkey 
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE;

-- payment_plans: CASCADE
ALTER TABLE public.payment_plans 
  DROP CONSTRAINT IF EXISTS payment_plans_branch_id_fkey,
  ADD CONSTRAINT payment_plans_branch_id_fkey 
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE;
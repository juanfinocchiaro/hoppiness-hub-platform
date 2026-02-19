-- Function to create transaction from delivered order
CREATE OR REPLACE FUNCTION public.create_sale_transaction_from_order()
RETURNS TRIGGER AS $$
DECLARE
  v_category_id uuid;
  v_receipt_type text;
  v_concept text;
BEGIN
  -- Only proceed when status changes TO 'delivered'
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    
    -- Determine category based on sales_channel
    SELECT id INTO v_category_id FROM transaction_categories 
    WHERE name = CASE NEW.sales_channel
      WHEN 'salon' THEN 'Ventas Salón'
      WHEN 'mostrador' THEN 'Ventas Takeaway'
      WHEN 'atencion_presencial' THEN 'Ventas Takeaway'
      WHEN 'rappi' THEN 'Ventas Rappi'
      WHEN 'pedidosya' THEN 'Ventas PedidosYa'
      WHEN 'mp_delivery' THEN 'Ventas MercadoPago Delivery'
      WHEN 'whatsapp' THEN 'Ventas Takeaway'
      WHEN 'telefono' THEN 'Ventas Takeaway'
      ELSE 'Otros Ingresos'
    END
    LIMIT 1;

    -- If category not found, use 'Otros Ingresos' as fallback
    IF v_category_id IS NULL THEN
      SELECT id INTO v_category_id FROM transaction_categories WHERE name = 'Otros Ingresos' LIMIT 1;
    END IF;

    -- Determine receipt_type based on invoice_type
    IF NEW.invoice_type = 'consumidor_final' OR NEW.invoice_type IS NULL THEN
      v_receipt_type := 'INTERNAL';
    ELSE
      v_receipt_type := 'OFFICIAL';
    END IF;

    -- Build concept
    v_concept := 'Venta Pedido #' || LEFT(NEW.id::text, 8) || ' - ' || NEW.customer_name;

    -- Insert transaction
    INSERT INTO public.transactions (
      branch_id,
      type,
      amount,
      concept,
      category_id,
      receipt_type,
      payment_origin,
      transaction_date,
      notes
    ) VALUES (
      NEW.branch_id,
      'income',
      NEW.total,
      v_concept,
      v_category_id,
      v_receipt_type,
      COALESCE(NEW.payment_method::text, 'efectivo'),
      CURRENT_DATE,
      'Generado automáticamente desde pedido'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on orders table
DROP TRIGGER IF EXISTS trigger_create_sale_transaction ON public.orders;
CREATE TRIGGER trigger_create_sale_transaction
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_sale_transaction_from_order();
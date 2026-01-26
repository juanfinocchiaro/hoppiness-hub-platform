-- =====================================================
-- FASE 1: Migración del modelo de disponibilidad de productos
-- 3 capas: is_active (catálogo) → is_enabled_by_brand (autorización) → is_available (operativo)
-- =====================================================

-- 1. Renombrar products.is_available a products.is_active
ALTER TABLE products RENAME COLUMN is_available TO is_active;

-- 2. Eliminar la tabla product_branch_exclusions (redundante)
DROP TABLE IF EXISTS product_branch_exclusions CASCADE;

-- 3. Cambiar el default de branch_products.is_available a false
ALTER TABLE branch_products ALTER COLUMN is_available SET DEFAULT false;

-- 4. Eliminar el trigger y función sync_product_to_branches con CASCADE
DROP TRIGGER IF EXISTS on_product_created ON products;
DROP TRIGGER IF EXISTS sync_product_to_branches ON products;
DROP FUNCTION IF EXISTS sync_product_to_branches() CASCADE;

-- 5. Eliminar el trigger sync_brand_exclusion_to_branch_products (la tabla ya no existe)
DROP FUNCTION IF EXISTS sync_brand_exclusion_to_branch_products() CASCADE;

-- 6. Modificar el trigger setup_new_branch para el nuevo comportamiento
CREATE OR REPLACE FUNCTION public.setup_new_branch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Para locales nuevos: crear branch_products para productos existentes
    -- is_enabled_by_brand = true (autorizado por marca)
    -- is_available = false (pausado, el local debe activarlo)
    INSERT INTO branch_products (branch_id, product_id, is_enabled_by_brand, is_available)
    SELECT 
        NEW.id,
        p.id,
        true,   -- autorizado por marca
        false   -- pausado por defecto
    FROM products p
    WHERE p.is_active = true
    ON CONFLICT (branch_id, product_id) DO NOTHING;
    
    RETURN NEW;
END;
$function$;

-- 7. Actualizar validate_order_item_before_insert para usar is_active
CREATE OR REPLACE FUNCTION public.validate_order_item_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    actual_price DECIMAL(10,2);
    product_available BOOLEAN;
    product_exists BOOLEAN;
    order_branch_id UUID;
BEGIN
    SELECT branch_id INTO order_branch_id
    FROM public.orders WHERE id = NEW.order_id;
    
    IF order_branch_id IS NULL THEN
        RAISE EXCEPTION 'Order does not exist';
    END IF;

    -- Cambiado: p.is_active en lugar de p.is_available
    -- Disponibilidad = is_active AND is_enabled_by_brand AND is_available
    SELECT 
        p.id IS NOT NULL,
        COALESCE(bp.custom_price, p.price),
        COALESCE(bp.is_available, false) AND COALESCE(bp.is_enabled_by_brand, false) AND p.is_active
    INTO product_exists, actual_price, product_available
    FROM public.products p
    LEFT JOIN public.branch_products bp ON bp.product_id = p.id AND bp.branch_id = order_branch_id
    WHERE p.id = NEW.product_id;
    
    IF NOT COALESCE(product_exists, false) THEN
        RAISE EXCEPTION 'Product does not exist';
    END IF;
    
    IF NOT COALESCE(product_available, false) THEN
        RAISE EXCEPTION 'Product is not available';
    END IF;
    
    IF actual_price > 0 AND ABS(NEW.unit_price - actual_price) > (actual_price * 0.10) THEN
        RAISE EXCEPTION 'Price mismatch: expected %, got %', actual_price, NEW.unit_price;
    END IF;
    
    IF NEW.quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be positive';
    END IF;
    
    IF NEW.quantity > 50 THEN
        RAISE EXCEPTION 'Quantity exceeds maximum allowed (50)';
    END IF;
    
    RETURN NEW;
END;
$function$;

-- 8. Actualizar get_available_products_for_channel para usar is_active
CREATE OR REPLACE FUNCTION public.get_available_products_for_channel(p_branch_id uuid, p_channel_slug text)
RETURNS TABLE(product_id uuid, product_name text, product_description text, base_price numeric, final_price numeric, category_id uuid, category_name text, image_url text, is_available boolean, unavailable_reason text, stock_quantity integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_channel_id UUID;
BEGIN
  SELECT id INTO v_channel_id FROM channels WHERE slug = p_channel_slug AND is_active = true;
  
  IF v_channel_id IS NULL THEN
    RAISE EXCEPTION 'Canal no encontrado o inactivo: %', p_channel_slug;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM branch_channels 
    WHERE branch_id = p_branch_id AND channel_id = v_channel_id AND is_enabled = true
  ) THEN
    RAISE EXCEPTION 'Canal no habilitado en esta sucursal';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id as product_id,
    p.name as product_name,
    p.description as product_description,
    p.price as base_price,
    COALESCE(
      bpca.local_price_override,
      pac.price_override,
      p.price
    ) as final_price,
    p.category_id,
    pc.name as category_name,
    p.image_url,
    COALESCE(bpca.is_available, bp.is_available, false) as is_available,
    bpca.unavailable_reason,
    bpca.stock_quantity
  FROM products p
  JOIN product_categories pc ON p.category_id = pc.id
  JOIN product_allowed_channels pac ON p.id = pac.product_id 
    AND pac.channel_id = v_channel_id 
    AND pac.is_allowed = true
  -- Nuevo: usar branch_products.is_enabled_by_brand
  JOIN branch_products bp ON p.id = bp.product_id 
    AND bp.branch_id = p_branch_id 
    AND bp.is_enabled_by_brand = true
  LEFT JOIN branch_product_channel_availability bpca 
    ON p.id = bpca.product_id 
    AND bpca.branch_id = p_branch_id 
    AND bpca.channel_id = v_channel_id
  WHERE 
    p.is_active = true
    AND pc.is_active = true
  ORDER BY pc.display_order, p.name;
END;
$function$;
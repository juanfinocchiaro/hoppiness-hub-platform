-- ===========================================
-- BUG 1: Sincronizar product_branch_exclusions con branch_products.is_enabled_by_brand
-- ===========================================

-- Función para sincronizar exclusiones de marca con branch_products
CREATE OR REPLACE FUNCTION sync_brand_exclusion_to_branch_products()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Asegurar que existe el registro en branch_products y deshabilitar
        INSERT INTO branch_products (product_id, branch_id, is_enabled_by_brand, is_available)
        VALUES (NEW.product_id, NEW.branch_id, false, false)
        ON CONFLICT (product_id, branch_id) 
        DO UPDATE SET is_enabled_by_brand = false;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Reactivar cuando se elimina la exclusión
        UPDATE branch_products 
        SET is_enabled_by_brand = true
        WHERE product_id = OLD.product_id 
        AND branch_id = OLD.branch_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- Trigger para sincronizar exclusiones
DROP TRIGGER IF EXISTS trg_sync_brand_exclusion ON product_branch_exclusions;
CREATE TRIGGER trg_sync_brand_exclusion
AFTER INSERT OR DELETE ON product_branch_exclusions
FOR EACH ROW EXECUTE FUNCTION sync_brand_exclusion_to_branch_products();

-- ===========================================
-- BUG 3: Mejorar trigger de productos nuevos (ya existe pero mejorar)
-- ===========================================

-- Reemplazar función existente para manejar is_enabled_by_brand correctamente
CREATE OR REPLACE FUNCTION sync_product_to_branches()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Crear registros en branch_products para todas las sucursales activas
    INSERT INTO branch_products (branch_id, product_id, is_available, is_enabled_by_brand)
    SELECT 
        b.id,
        NEW.id,
        true,
        -- Verificar si hay exclusión preexistente (edge case)
        NOT EXISTS (
            SELECT 1 FROM product_branch_exclusions pbe 
            WHERE pbe.product_id = NEW.id AND pbe.branch_id = b.id
        )
    FROM branches b
    WHERE b.is_active = true
    ON CONFLICT (branch_id, product_id) DO NOTHING;
    
    RETURN NEW;
END;
$$;

-- ===========================================
-- BUG 4: Mejorar trigger de sucursales nuevas (ya existe pero mejorar)
-- ===========================================

-- Reemplazar función existente para manejar is_enabled_by_brand correctamente
CREATE OR REPLACE FUNCTION setup_new_branch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Insertar todos los productos para la nueva sucursal
    INSERT INTO branch_products (branch_id, product_id, is_available, is_enabled_by_brand, custom_price, stock_quantity)
    SELECT 
        NEW.id,
        p.id,
        true,
        -- Verificar exclusiones de marca
        NOT EXISTS (
            SELECT 1 FROM product_branch_exclusions pbe 
            WHERE pbe.product_id = p.id AND pbe.branch_id = NEW.id
        ),
        NULL, -- usa precio global
        NULL  -- sin control de stock
    FROM products p
    WHERE p.is_available = true
    ON CONFLICT (branch_id, product_id) DO NOTHING;
    
    RETURN NEW;
END;
$$;

-- ===========================================
-- MIGRACIÓN DE DATOS EXISTENTES
-- ===========================================

-- Sincronizar is_enabled_by_brand basado en exclusiones existentes
UPDATE branch_products bp
SET is_enabled_by_brand = false
WHERE EXISTS (
    SELECT 1 FROM product_branch_exclusions pbe
    WHERE pbe.product_id = bp.product_id
    AND pbe.branch_id = bp.branch_id
);

-- Asegurar que productos SIN exclusión tengan is_enabled_by_brand = true
UPDATE branch_products bp
SET is_enabled_by_brand = true
WHERE NOT EXISTS (
    SELECT 1 FROM product_branch_exclusions pbe
    WHERE pbe.product_id = bp.product_id
    AND pbe.branch_id = bp.branch_id
)
AND is_enabled_by_brand = false;
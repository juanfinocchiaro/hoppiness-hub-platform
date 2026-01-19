-- Create function to set up default cash registers for new branches
CREATE OR REPLACE FUNCTION public.setup_default_cash_registers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Create 3 default cash registers for the new branch
    INSERT INTO public.cash_registers (branch_id, name, display_order, is_active)
    VALUES 
        (NEW.id, 'Caja de Venta', 1, true),
        (NEW.id, 'Caja de Alivio', 2, true),
        (NEW.id, 'Caja de Resguardo', 3, true);
    
    RETURN NEW;
END;
$$;

-- Create trigger to run after branch creation
DROP TRIGGER IF EXISTS trigger_setup_cash_registers ON public.branches;
CREATE TRIGGER trigger_setup_cash_registers
    AFTER INSERT ON public.branches
    FOR EACH ROW
    EXECUTE FUNCTION public.setup_default_cash_registers();
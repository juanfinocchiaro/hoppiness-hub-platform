-- Trigger para asignar admin a juan.finocchiar@gmail.com automáticamente
CREATE OR REPLACE FUNCTION public.assign_admin_to_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Si el email es juan.finocchiar@gmail.com, asignar rol admin
    IF NEW.email = 'juan.finocchiar@gmail.com' THEN
        -- Eliminar rol por defecto de empleado
        DELETE FROM public.user_roles WHERE user_id = NEW.id AND role = 'empleado';
        
        -- Insertar rol admin
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Crear trigger que se ejecuta después de handle_new_user
CREATE TRIGGER assign_admin_after_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.assign_admin_to_owner();
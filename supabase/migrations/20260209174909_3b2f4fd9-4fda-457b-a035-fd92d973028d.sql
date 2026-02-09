
ALTER TABLE public.proveedores
  ADD COLUMN banco varchar,
  ADD COLUMN numero_cuenta varchar,
  ADD COLUMN cbu varchar,
  ADD COLUMN alias_cbu varchar,
  ADD COLUMN titular_cuenta varchar,
  ADD COLUMN telefono_secundario varchar,
  ADD COLUMN contacto_secundario varchar;

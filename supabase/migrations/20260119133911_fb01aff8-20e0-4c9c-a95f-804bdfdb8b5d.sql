
-- PARTE 1: Agregar nuevos valores al enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'encargado';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cajero';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'kds';

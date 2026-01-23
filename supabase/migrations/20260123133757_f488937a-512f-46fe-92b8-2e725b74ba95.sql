-- Add missing values to sales_channel enum
ALTER TYPE public.sales_channel ADD VALUE IF NOT EXISTS 'salon';
ALTER TYPE public.sales_channel ADD VALUE IF NOT EXISTS 'mostrador';
ALTER TYPE public.sales_channel ADD VALUE IF NOT EXISTS 'webapp';
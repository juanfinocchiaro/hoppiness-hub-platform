-- Create availability schedules table for categories and products
CREATE TABLE public.availability_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Reference: either category or product (one must be set)
  category_id UUID REFERENCES public.product_categories(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  
  -- Schedule type: 'daily' (same time every day), 'weekly' (specific days), 'date_range' (specific dates)
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'date_range')),
  
  -- Time range (used for daily and weekly)
  start_time TIME,
  end_time TIME,
  
  -- Days of week (0=Sunday, 6=Saturday) - used for 'weekly' type
  days_of_week INTEGER[] DEFAULT '{}',
  
  -- Date range - used for 'date_range' type
  start_date DATE,
  end_date DATE,
  
  -- Is schedule active
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadata
  name TEXT, -- Optional name like "Happy Hour", "Almuerzo"
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure either category_id OR product_id is set, not both
  CONSTRAINT availability_schedules_target_check CHECK (
    (category_id IS NOT NULL AND product_id IS NULL) OR
    (category_id IS NULL AND product_id IS NOT NULL)
  )
);

-- Create indexes for efficient lookups
CREATE INDEX idx_availability_schedules_category ON public.availability_schedules(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX idx_availability_schedules_product ON public.availability_schedules(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX idx_availability_schedules_active ON public.availability_schedules(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.availability_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage availability schedules"
ON public.availability_schedules
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Public can read active schedules"
ON public.availability_schedules
FOR SELECT
USING (is_active = true);

-- Trigger for updated_at
CREATE TRIGGER update_availability_schedules_updated_at
BEFORE UPDATE ON public.availability_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check if item is available based on schedules
CREATE OR REPLACE FUNCTION public.is_item_available_now(
  p_category_id UUID DEFAULT NULL,
  p_product_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_schedule RECORD;
  v_now_time TIME := LOCALTIME;
  v_now_date DATE := CURRENT_DATE;
  v_now_dow INTEGER := EXTRACT(DOW FROM CURRENT_DATE)::INTEGER;
  v_has_active_schedule BOOLEAN := false;
  v_is_available BOOLEAN := false;
BEGIN
  -- Check schedules for the item
  FOR v_schedule IN 
    SELECT * FROM public.availability_schedules
    WHERE is_active = true
    AND (
      (p_category_id IS NOT NULL AND category_id = p_category_id) OR
      (p_product_id IS NOT NULL AND product_id = p_product_id)
    )
  LOOP
    v_has_active_schedule := true;
    
    CASE v_schedule.schedule_type
      WHEN 'daily' THEN
        IF v_now_time >= v_schedule.start_time AND v_now_time <= v_schedule.end_time THEN
          v_is_available := true;
        END IF;
        
      WHEN 'weekly' THEN
        IF v_now_dow = ANY(v_schedule.days_of_week) 
           AND v_now_time >= v_schedule.start_time 
           AND v_now_time <= v_schedule.end_time THEN
          v_is_available := true;
        END IF;
        
      WHEN 'date_range' THEN
        IF v_now_date >= v_schedule.start_date AND v_now_date <= v_schedule.end_date THEN
          -- If time is also specified, check it
          IF v_schedule.start_time IS NOT NULL AND v_schedule.end_time IS NOT NULL THEN
            IF v_now_time >= v_schedule.start_time AND v_now_time <= v_schedule.end_time THEN
              v_is_available := true;
            END IF;
          ELSE
            v_is_available := true;
          END IF;
        END IF;
    END CASE;
    
    -- If already available, no need to check more
    IF v_is_available THEN
      RETURN true;
    END IF;
  END LOOP;
  
  -- If no active schedules exist, item is always available
  IF NOT v_has_active_schedule THEN
    RETURN true;
  END IF;
  
  RETURN v_is_available;
END;
$$;
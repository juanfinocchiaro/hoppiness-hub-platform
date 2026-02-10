
-- Drop old check constraint and add new one with 'ultrasmash'
ALTER TABLE inspection_templates DROP CONSTRAINT inspection_templates_inspection_type_check;
ALTER TABLE inspection_templates ADD CONSTRAINT inspection_templates_inspection_type_check 
  CHECK (inspection_type = ANY (ARRAY['boh'::text, 'foh'::text, 'ultrasmash'::text]));

-- Also check branch_inspections for similar constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.branch_inspections'::regclass 
    AND conname = 'branch_inspections_inspection_type_check'
  ) THEN
    ALTER TABLE branch_inspections DROP CONSTRAINT branch_inspections_inspection_type_check;
    ALTER TABLE branch_inspections ADD CONSTRAINT branch_inspections_inspection_type_check 
      CHECK (inspection_type = ANY (ARRAY['boh'::text, 'foh'::text, 'ultrasmash'::text]));
  END IF;
END $$;

-- Insert 11 Ultra Smash monitoring templates
INSERT INTO inspection_templates (inspection_type, category, item_key, item_label, sort_order, is_active) VALUES
  ('ultrasmash', 'ultrasmash', 'us_pan', 'Pan enmantecado, condimentación y cheddar en corona antes de tirar la carne', 1, true),
  ('ultrasmash', 'ultrasmash', 'us_temp', 'Temperatura correcta de plancha', 2, true),
  ('ultrasmash', 'ultrasmash', 'us_bolit', 'Bolitas colocadas sin mover', 3, true),
  ('ultrasmash', 'ultrasmash', 'us_smash', 'Smash inmediato, firme y centrado', 4, true),
  ('ultrasmash', 'ultrasmash', 'us_expan', 'Smash logra expansión pareja', 5, true),
  ('ultrasmash', 'ultrasmash', 'us_sal', 'Salado controlado (cantidad correcta)', 6, true),
  ('ultrasmash', 'ultrasmash', 'us_borde', 'Bordes crocantes visibles', 7, true),
  ('ultrasmash', 'ultrasmash', 'us_chedd', 'Cheddar agregado en tiempo correcto', 8, true),
  ('ultrasmash', 'ultrasmash', 'us_retir', 'Retiro con espátula afilada', 9, true),
  ('ultrasmash', 'ultrasmash', 'us_apila', 'Apilado correcto de medallones', 10, true),
  ('ultrasmash', 'ultrasmash', 'us_final', 'Producto final respeta estándar Ultra Smash', 11, true);

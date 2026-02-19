-- Add new columns to shift_closures for comparison and cash count system
ALTER TABLE shift_closures
ADD COLUMN IF NOT EXISTS arqueo_caja JSONB DEFAULT '{"diferencia_caja": 0}'::jsonb,
ADD COLUMN IF NOT EXISTS diferencia_posnet DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS diferencia_apps DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tiene_alerta_posnet BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tiene_alerta_apps BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tiene_alerta_caja BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN shift_closures.arqueo_caja IS 'Cash count data: { diferencia_caja: number }';
COMMENT ON COLUMN shift_closures.diferencia_posnet IS 'Difference between Nucleo cards and Posnet terminal';
COMMENT ON COLUMN shift_closures.diferencia_apps IS 'Difference between Nucleo apps and app panels';
COMMENT ON COLUMN shift_closures.tiene_alerta_posnet IS 'True if posnet difference is not zero';
COMMENT ON COLUMN shift_closures.tiene_alerta_apps IS 'True if apps difference is not zero';
COMMENT ON COLUMN shift_closures.tiene_alerta_caja IS 'True if cash difference is not zero';
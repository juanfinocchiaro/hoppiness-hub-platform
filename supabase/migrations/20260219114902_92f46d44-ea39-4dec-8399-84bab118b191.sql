ALTER TABLE ventas_mensuales_local 
  ADD COLUMN IF NOT EXISTS fuente text NOT NULL DEFAULT 'manual';
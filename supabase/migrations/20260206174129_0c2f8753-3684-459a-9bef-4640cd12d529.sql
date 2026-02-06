-- Refactorización Reuniones v2.0: Agregar campos para flujo de 2 fases

-- 1. Agregar nuevos campos a meetings
ALTER TABLE meetings 
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'mi_local';

-- 2. Hacer branch_id nullable para reuniones de red
ALTER TABLE meetings ALTER COLUMN branch_id DROP NOT NULL;

-- 3. Hacer notes nullable (se completa al ejecutar)
ALTER TABLE meetings ALTER COLUMN notes DROP NOT NULL;

-- 4. Agregar campos a meeting_participants
ALTER TABLE meeting_participants
  ADD COLUMN IF NOT EXISTS was_present BOOLEAN,
  ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;

-- 5. Migrar datos existentes: date → scheduled_at, closed_at = created_at
UPDATE meetings 
SET 
  scheduled_at = date,
  closed_at = created_at,
  status = 'cerrada'
WHERE scheduled_at IS NULL;

-- 6. Migrar attended → was_present en participantes
UPDATE meeting_participants 
SET was_present = attended
WHERE was_present IS NULL;
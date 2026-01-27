-- =====================================================
-- TABLAS: communications, communication_reads
-- Sistema de comunicados internos de la Marca al Staff
-- =====================================================

-- Tipo de comunicado
CREATE TYPE communication_type AS ENUM ('info', 'warning', 'urgent', 'celebration');

-- Tabla principal de comunicados
CREATE TABLE IF NOT EXISTS public.communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Contenido
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type communication_type DEFAULT 'info',
  
  -- Alcance (null = todas las sucursales)
  target_branch_ids UUID[] DEFAULT NULL,
  target_roles TEXT[] DEFAULT NULL, -- ['franquiciado', 'encargado', 'cajero', etc]
  
  -- Estado
  is_published BOOLEAN DEFAULT true,
  published_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  
  -- Auditoría
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ,
  
  -- Índices
  CONSTRAINT valid_title CHECK (char_length(title) >= 3)
);

-- Tabla de lecturas (quién leyó qué)
CREATE TABLE IF NOT EXISTS public.communication_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  communication_id UUID NOT NULL REFERENCES communications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  read_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(communication_id, user_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_communications_published ON communications(is_published, published_at);
CREATE INDEX IF NOT EXISTS idx_communications_expires ON communications(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_communication_reads_user ON communication_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_communication_reads_comm ON communication_reads(communication_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_communications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_communications_updated_at ON communications;
CREATE TRIGGER trigger_communications_updated_at
  BEFORE UPDATE ON communications
  FOR EACH ROW
  EXECUTE FUNCTION update_communications_updated_at();

-- RLS
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_reads ENABLE ROW LEVEL SECURITY;

-- Communications: Admins pueden todo, staff puede leer las que le corresponden
CREATE POLICY "Superadmin can manage communications"
  ON communications FOR ALL
  USING (is_superadmin(auth.uid()));

CREATE POLICY "Staff can view published communications"
  ON communications FOR SELECT
  USING (
    is_published = true 
    AND (expires_at IS NULL OR expires_at > now())
  );

-- Reads: usuarios pueden marcar como leídas y ver sus propias lecturas
CREATE POLICY "Users can insert their own reads"
  ON communication_reads FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own reads"
  ON communication_reads FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Superadmin can view all reads"
  ON communication_reads FOR SELECT
  USING (is_superadmin(auth.uid()));
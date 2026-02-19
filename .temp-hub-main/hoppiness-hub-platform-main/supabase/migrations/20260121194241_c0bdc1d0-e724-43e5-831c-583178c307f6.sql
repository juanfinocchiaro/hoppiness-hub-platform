-- Add internal_notes and loyalty_points to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS internal_notes JSONB DEFAULT '[]';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;

-- Create employee_data table for labor/banking info per branch
CREATE TABLE IF NOT EXISTS employee_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    
    -- Personal data
    dni TEXT,
    birth_date DATE,
    personal_address TEXT,
    emergency_contact TEXT,
    emergency_phone TEXT,
    
    -- Banking data
    bank_name TEXT,
    cbu TEXT,
    alias TEXT,
    cuil TEXT,
    
    -- Labor data
    hire_date DATE DEFAULT CURRENT_DATE,
    monthly_hours_target INTEGER DEFAULT 160,
    hourly_rate DECIMAL(10,2),
    
    -- Notes
    internal_notes JSONB DEFAULT '[]',
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(user_id, branch_id)
);

-- Create warnings table for employee warnings
CREATE TABLE IF NOT EXISTS warnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    
    warning_type TEXT NOT NULL CHECK (warning_type IN ('late_arrival', 'absence', 'misconduct', 'uniform', 'other')),
    description TEXT NOT NULL,
    warning_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    issued_by UUID,
    acknowledged_at TIMESTAMPTZ,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_employee_data_user ON employee_data(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_data_branch ON employee_data(branch_id);
CREATE INDEX IF NOT EXISTS idx_warnings_user ON warnings(user_id);
CREATE INDEX IF NOT EXISTS idx_warnings_branch ON warnings(branch_id);
CREATE INDEX IF NOT EXISTS idx_warnings_active ON warnings(branch_id, is_active) WHERE is_active = true;

-- RLS for employee_data
ALTER TABLE employee_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own employee_data"
ON employee_data FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Franquiciado and Encargado can manage employee_data"
ON employee_data FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles_v2 ur
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND ur.local_role IN ('franquiciado', 'encargado')
        AND branch_id = ANY(ur.branch_ids)
    )
);

CREATE POLICY "Superadmin can manage all employee_data"
ON employee_data FOR ALL TO authenticated
USING (public.is_superadmin(auth.uid()));

-- RLS for warnings
ALTER TABLE warnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own warnings"
ON warnings FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Franquiciado and Encargado can manage warnings"
ON warnings FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles_v2 ur
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND ur.local_role IN ('franquiciado', 'encargado')
        AND branch_id = ANY(ur.branch_ids)
    )
);

CREATE POLICY "Superadmin can manage all warnings"
ON warnings FOR ALL TO authenticated
USING (public.is_superadmin(auth.uid()));

-- Trigger for updated_at on employee_data
CREATE TRIGGER update_employee_data_updated_at
BEFORE UPDATE ON employee_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
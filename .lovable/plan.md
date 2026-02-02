

# PLAN MAESTRO DE IMPLEMENTACIÓN - HOPPINESS HUB V2

## Resumen de Decisiones Confirmadas

| Tema | Decisión |
|------|----------|
| Roles multi-sucursal | **Sí**, roles diferentes por sucursal |
| Turnos medianoche | Asignar al día de **entrada** |
| Contador local ve | Horas, adelantos **y** apercibimientos |
| UI de navegación | **Tabs** dentro de páginas (menos riesgo) |
| Sistema de ayuda | **Ahora** - Combinación D (tooltips + tour + botón "?") |
| Comunicados urgentes | **Banner llamativo** sin bloquear navegación |
| Requiere confirmación | Superadmin **y** encargados pueden marcar |
| Usuarios sin rol | Página **casi vacía** solo con datos personales |
| Target de horas | **No existe** - enfoque en optimización/productividad |

---

## FASE 0: MIGRACIÓN DE BASE DE DATOS (Crítica)

### Problema Arquitectónico

La estructura actual de `user_roles_v2` tiene un **único `local_role`** por usuario:

```
user_roles_v2
├── user_id
├── brand_role (único)
├── local_role (único) ← PROBLEMA: mismo rol para todas las sucursales
├── branch_ids[] 
└── authorization_pin_hash
```

### Solución: Nueva tabla `user_branch_roles`

```sql
-- Nueva tabla para roles específicos por sucursal
CREATE TABLE public.user_branch_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  local_role local_role_type NOT NULL,
  authorization_pin_hash TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Un usuario solo puede tener un rol por sucursal
  UNIQUE(user_id, branch_id)
);

-- Índices para performance
CREATE INDEX idx_ubr_user_id ON user_branch_roles(user_id);
CREATE INDEX idx_ubr_branch_id ON user_branch_roles(branch_id);
CREATE INDEX idx_ubr_active ON user_branch_roles(is_active) WHERE is_active = true;

-- Trigger para updated_at
CREATE TRIGGER update_user_branch_roles_updated_at
  BEFORE UPDATE ON user_branch_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE user_branch_roles ENABLE ROW LEVEL SECURITY;

-- Superadmin ve todo
CREATE POLICY "ubr_superadmin" ON user_branch_roles
  FOR ALL TO authenticated
  USING (is_superadmin(auth.uid()));

-- Encargados/Franquiciados ven su sucursal
CREATE POLICY "ubr_branch_managers" ON user_branch_roles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_branch_roles ubr2
      WHERE ubr2.user_id = auth.uid()
      AND ubr2.branch_id = user_branch_roles.branch_id
      AND ubr2.local_role IN ('encargado', 'franquiciado')
      AND ubr2.is_active = true
    )
  );

-- Usuario ve sus propios roles
CREATE POLICY "ubr_own" ON user_branch_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Migrar datos existentes
INSERT INTO user_branch_roles (user_id, branch_id, local_role, authorization_pin_hash, is_active)
SELECT 
  ur.user_id,
  unnest(ur.branch_ids) as branch_id,
  ur.local_role,
  ur.authorization_pin_hash,
  ur.is_active
FROM user_roles_v2 ur
WHERE ur.local_role IS NOT NULL 
  AND ur.branch_ids IS NOT NULL 
  AND array_length(ur.branch_ids, 1) > 0;

-- Actualizar funciones helper existentes
CREATE OR REPLACE FUNCTION public.get_local_role_for_branch(_user_id uuid, _branch_id uuid)
RETURNS local_role_type
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT local_role FROM user_branch_roles
  WHERE user_id = _user_id 
    AND branch_id = _branch_id
    AND is_active = true
  LIMIT 1
$$;

-- Función para obtener todas las sucursales de un usuario
CREATE OR REPLACE FUNCTION public.get_user_branches(_user_id uuid)
RETURNS TABLE(branch_id uuid, local_role local_role_type)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT branch_id, local_role 
  FROM user_branch_roles
  WHERE user_id = _user_id AND is_active = true
$$;
```

### Migración 2: Campos para comunicados

```sql
-- Comunicados que requieren confirmación explícita
ALTER TABLE communications 
  ADD COLUMN IF NOT EXISTS requires_confirmation BOOLEAN DEFAULT false;

-- Registro de confirmación (diferente de solo leer)
ALTER TABLE communication_reads 
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
```

### Migración 3: Sistema de ayuda

```sql
-- Preferencias de ayuda del usuario
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS help_dismissed_pages TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS show_floating_help BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
```

---

## FASE 1: Actualizar Hook de Permisos

### Archivo: `src/hooks/usePermissionsV2.ts`

**Cambios principales:**

1. Nueva query para `user_branch_roles` en lugar de leer `local_role` de `user_roles_v2`
2. El rol local ahora depende de `currentBranchId`
3. Nueva función `getLocalRoleForBranch(branchId)`

```typescript
// Nueva estructura de datos
interface UserBranchRole {
  branch_id: string;
  local_role: LocalRole;
  authorization_pin_hash: string | null;
}

// Nueva query para roles por sucursal
const { data: branchRoles } = useQuery({
  queryKey: ['user-branch-roles', user?.id],
  queryFn: async () => {
    const { data } = await supabase
      .from('user_branch_roles')
      .select('branch_id, local_role, authorization_pin_hash')
      .eq('user_id', user.id)
      .eq('is_active', true);
    return data as UserBranchRole[];
  },
  enabled: !!user?.id,
});

// El localRole ahora depende de la sucursal actual
const localRole = currentBranchId 
  ? branchRoles?.find(r => r.branch_id === currentBranchId)?.local_role 
  : null;

// Nueva función helper
const getLocalRoleForBranch = (branchId: string): LocalRole => {
  return branchRoles?.find(r => r.branch_id === branchId)?.local_role || null;
};

// Actualizar permisos de contador_local
const localPermissions = {
  // ...existentes...
  
  // AGREGAR acceso para contador_local
  canViewSalaryAdvances: hasCurrentBranchAccess && (isEncargado || isFranquiciado || isContadorLocal),
  canViewWarnings: hasCurrentBranchAccess && (isEncargado || isFranquiciado || isContadorLocal),
  canViewMonthlyHours: hasCurrentBranchAccess && (isEncargado || isFranquiciado || isContadorLocal),
};
```

### Archivos que consumen el hook (impactados)

Revisar y actualizar:
- `src/pages/local/BranchLayout.tsx`
- `src/pages/local/TeamPage.tsx`
- `src/pages/local/AdvancesPage.tsx`
- `src/pages/local/WarningsPage.tsx`
- `src/components/local/ManagerDashboard.tsx`
- Todos los componentes en `src/components/local/team/`

---

## FASE 2: Vista de Horas del Mes

### Nuevo archivo: `src/hooks/useMonthlyHours.ts`

```typescript
interface EmployeeHoursSummary {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  localRole: LocalRole;
  totalMinutes: number;
  daysWorked: number;
  averageMinutesPerDay: number;
  // Para productividad - NO hay target, es para comparar
  entries: {
    date: string;
    checkIn: string;
    checkOut: string | null;
    minutesWorked: number;
  }[];
  // Advertencias
  hasUnpairedEntries: boolean;
  unpairedCount: number;
}

// Lógica de cálculo
function calculateHours(clockEntries: ClockEntry[]): EmployeeHoursSummary[] {
  // 1. Agrupar por user_id
  // 2. Ordenar por timestamp dentro de cada grupo
  // 3. Emparejar: entrada → siguiente salida
  // 4. Si entrada a las 23:00 y salida a las 03:00 → asignar todo al día de entrada
  // 5. Sumar minutos
  // 6. Marcar entradas sin par como warning
}
```

### Nuevo archivo: `src/pages/local/MonthlyHoursPage.tsx`

```text
┌─────────────────────────────────────────────────────────────────┐
│ HORAS DEL MES - FEBRERO 2026            [← Ene] [Feb] [Mar →]  │
│ Equipo de Hoppiness Alberdi                      [Exportar CSV] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─ Juan Pérez ─────────────────────────────────────────────┐  │
│  │ 👤 Encargado   │   176h 30m   │   22 días   │   8h 01m   │  │
│  │                                                 promedio   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─ María García ────────────────────────────────────────────┐  │
│  │ 👤 Cajero      │   160h 00m   │   20 días   │   8h 00m   │  │
│  │                                                 promedio   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─ Carlos López ⚠️ 2 fichajes sin par ──────────────────────┐  │
│  │ 👤 Empleado    │   88h 45m    │   12 días   │   7h 24m   │  │
│  │                                                 promedio   │  │
│  │ [Ver detalle] [Corregir fichajes]                         │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ TOTAL EQUIPO: 425h 15m trabajadas │ 54 días-persona           │ │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- Selector de mes/año
- Exportar a CSV con columnas: Empleado, Rol, Horas, Días, Promedio
- Cards expandibles para ver detalle día a día
- Warning visual para fichajes sin par
- Accesible para: encargado, franquiciado, contador_local

### Agregar Tab en TeamPage

Modificar `src/pages/local/TeamPage.tsx` para incluir tabs:

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

<Tabs defaultValue="team">
  <TabsList>
    <TabsTrigger value="team">Personal</TabsTrigger>
    <TabsTrigger value="hours">Horas del Mes</TabsTrigger>
  </TabsList>
  
  <TabsContent value="team">
    {/* Contenido actual de TeamPage */}
  </TabsContent>
  
  <TabsContent value="hours">
    <MonthlyHoursSummary branchId={branch.id} />
  </TabsContent>
</Tabs>
```

---

## FASE 3: Gestión de Equipo por Sucursal (desde Mi Marca)

### Nuevo archivo: `src/components/admin/BranchTeamTab.tsx`

```typescript
interface BranchTeamTabProps {
  branchId: string;
  branchName: string;
}

// Features:
// 1. Lista de personal actual en esta sucursal (desde user_branch_roles)
// 2. Mostrar: avatar, nombre, email, rol en ESTA sucursal
// 3. Selector de rol (dropdown) para cambiar
// 4. Botón "Quitar" para eliminar de esta sucursal
// 5. Buscador para agregar (busca en profiles por email)
// 6. Modal para confirmar asignación con selector de rol
```

```text
┌─────────────────────────────────────────────────────────────────┐
│ EQUIPO DE HOPPINESS ALBERDI                                     │
├─────────────────────────────────────────────────────────────────┤
│ [Buscar por email para agregar...]              [+ Agregar]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  👤 Juan Pérez          │ juan@email.com   │ [Encargado ▼] │ 🗑 │
│  👤 María García        │ maria@email.com  │ [Cajero    ▼] │ 🗑 │
│  👤 Carlos López        │ carlos@email.com │ [Empleado  ▼] │ 🗑 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Modificar: `src/pages/admin/BranchDetail.tsx`

Agregar sistema de tabs:

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BranchTeamTab from '@/components/admin/BranchTeamTab';

// En el return:
<Tabs defaultValue="info">
  <TabsList>
    <TabsTrigger value="info">Información</TabsTrigger>
    <TabsTrigger value="team">Equipo</TabsTrigger>
  </TabsList>
  
  <TabsContent value="info">
    <BranchEditPanel branch={branch} onSaved={refetch} onCancel={() => navigate('/mimarca')} />
  </TabsContent>
  
  <TabsContent value="team">
    <BranchTeamTab branchId={branch.id} branchName={branch.name} />
  </TabsContent>
</Tabs>
```

---

## FASE 4: Mejoras en Comunicados

### Modificar: `src/pages/admin/CommunicationsPage.tsx`

1. **Nuevo checkbox al crear:** "Requiere confirmación del equipo"
2. **Ver lectores:** Botón/ícono que abre modal con lista

```tsx
// En el formulario
<div className="flex items-center gap-2">
  <Checkbox 
    id="requires-confirmation"
    checked={requiresConfirmation}
    onCheckedChange={setRequiresConfirmation}
  />
  <Label htmlFor="requires-confirmation">
    Requiere confirmación del equipo
  </Label>
</div>

// En la lista de comunicados
<Button 
  variant="ghost" 
  size="sm"
  onClick={() => openReadersModal(comm.id)}
>
  <Eye className="h-4 w-4 mr-1" />
  {comm.read_count} lecturas
</Button>
```

### Nuevo componente: `src/components/communications/ReadersModal.tsx`

```text
┌─────────────────────────────────────────────────────────────────┐
│ LECTURAS: "Nuevo menú de temporada"                    [X]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✅ Juan Pérez        │ Leído hace 2 días │ Confirmó ✓         │
│  👁 María García      │ Leído hace 1 día  │ Sin confirmar      │
│  ⏳ Carlos López      │ No leído          │                     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ 2 de 3 leyeron │ 1 de 3 confirmó                               │
└─────────────────────────────────────────────────────────────────┘
```

### Modificar: `src/components/cuenta/MyCommunicationsCard.tsx`

Para comunicados con `requires_confirmation`:

```tsx
{comm.requires_confirmation && !isConfirmed && (
  <Button 
    size="sm" 
    onClick={() => confirmCommunication(comm.id)}
    className="mt-2"
  >
    <CheckCircle className="h-4 w-4 mr-1" />
    Confirmar lectura
  </Button>
)}
```

### Nuevo: Banner de urgentes en CuentaDashboard

```tsx
// Al inicio del main content
const { data: urgentUnread } = useQuery({
  queryKey: ['urgent-unread', user?.id],
  queryFn: async () => {
    const { data } = await supabase
      .from('communications')
      .select('id, title')
      .eq('type', 'urgent')
      .eq('is_published', true)
      .not('id', 'in', 
        supabase.from('communication_reads')
          .select('communication_id')
          .eq('user_id', user.id)
      );
    return data;
  }
});

{urgentUnread?.length > 0 && (
  <Alert variant="destructive" className="mb-4">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>Mensaje urgente</AlertTitle>
    <AlertDescription>
      Tenés {urgentUnread.length} comunicado(s) urgente(s) sin leer.
      <Button variant="link" className="p-0 h-auto ml-2">
        Ver ahora
      </Button>
    </AlertDescription>
  </Alert>
)}
```

---

## FASE 5: Sistema de Ayuda Contextual

### Nuevo archivo: `src/hooks/useContextualHelp.ts`

```typescript
interface HelpConfig {
  pageId: string;
  title: string;
  description: string;
  tips: string[];
  videoUrl?: string;
}

// Registro de ayuda por página
const HELP_CONFIG: Record<string, HelpConfig> = {
  'local-team': {
    pageId: 'local-team',
    title: 'Gestión de Equipo',
    description: 'Desde aquí podés ver y gestionar a todos los empleados asignados a esta sucursal.',
    tips: [
      'Tocá en un empleado para ver sus datos completos',
      'Usá el botón "Invitar" para sumar nuevos integrantes',
      'Los roles determinan qué puede hacer cada persona',
    ],
  },
  'local-schedules': {
    pageId: 'local-schedules',
    title: 'Horarios del Mes',
    description: 'Planificá los turnos de trabajo de tu equipo.',
    tips: [
      'Publicá los horarios antes del día 25 de cada mes',
      'Los empleados reciben notificación cuando publicás',
      'Podés copiar horarios de la semana anterior',
    ],
  },
  // ... más páginas
};

export function useContextualHelp(pageId: string) {
  const { user } = useAuth();
  
  // Query para preferencias del usuario
  const { data: profile } = useQuery({...});
  
  const isDismissed = profile?.help_dismissed_pages?.includes(pageId);
  const showFloatingHelp = profile?.show_floating_help ?? true;
  
  const dismissHelp = async () => {
    await supabase
      .from('profiles')
      .update({
        help_dismissed_pages: [...(profile?.help_dismissed_pages || []), pageId]
      })
      .eq('user_id', user.id);
  };
  
  return {
    config: HELP_CONFIG[pageId],
    isDismissed,
    showFloatingHelp,
    dismissHelp,
  };
}
```

### Nuevo componente: `src/components/ui/PageHelp.tsx`

```tsx
// Banner colapsable en la parte superior de cada página
interface PageHelpProps {
  pageId: string;
}

export function PageHelp({ pageId }: PageHelpProps) {
  const { config, isDismissed, dismissHelp } = useContextualHelp(pageId);
  
  if (!config || isDismissed) return null;
  
  return (
    <Collapsible defaultOpen className="mb-4">
      <Card className="bg-blue-50 border-blue-200">
        <CollapsibleTrigger className="w-full">
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">{config.title}</span>
            </div>
            <ChevronDown className="h-4 w-4" />
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-3">
            <p className="text-sm text-blue-800 mb-2">{config.description}</p>
            <ul className="text-sm space-y-1">
              {config.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span className="text-blue-700">{tip}</span>
                </li>
              ))}
            </ul>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={dismissHelp}
              className="mt-2 text-blue-600"
            >
              No mostrar de nuevo
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
```

### Nuevo componente: `src/components/ui/FloatingHelpButton.tsx`

```tsx
// Botón flotante "?" en esquina inferior derecha
export function FloatingHelpButton({ pageId }: { pageId: string }) {
  const { config, showFloatingHelp } = useContextualHelp(pageId);
  const [open, setOpen] = useState(false);
  
  if (!showFloatingHelp || !config) return null;
  
  return (
    <>
      <Button
        className="fixed bottom-4 right-4 rounded-full w-12 h-12 shadow-lg z-50"
        onClick={() => setOpen(true)}
      >
        <HelpCircle className="h-6 w-6" />
      </Button>
      
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{config.title}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <p>{config.description}</p>
            <div className="space-y-2">
              <h4 className="font-medium">Tips:</h4>
              <ul className="space-y-2">
                {config.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
```

### Tooltips en campos importantes

Agregar `TooltipProvider` wrapper en App y usar tooltips inline:

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <InfoCircle className="h-4 w-4 text-muted-foreground cursor-help" />
  </TooltipTrigger>
  <TooltipContent>
    <p>Los turnos que cruzan medianoche se asignan al día de entrada</p>
  </TooltipContent>
</Tooltip>
```

---

## FASE 6: Mi Cuenta Adaptativa

### Modificar: `src/pages/cuenta/CuentaDashboard.tsx`

```tsx
const { brandRole, localRole, branchIds } = usePermissionsV2();
const hasBrandAccess = !!brandRole;
const hasLocalAccess = branchIds.length > 0;
const hasNoRole = !brandRole && branchIds.length === 0;

// Banner urgente (Fase 4)
{urgentCommunications?.length > 0 && <UrgentBanner comms={urgentCommunications} />}

// Caso 1: Usuario sin ningún rol
{hasNoRole && (
  <Card className="border-dashed">
    <CardContent className="py-12 text-center">
      <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      <h2 className="text-lg font-medium">Tu cuenta está activa</h2>
      <p className="text-sm text-muted-foreground mt-1">
        Si trabajás en Hoppiness, pedile a tu encargado que te asigne un rol.
      </p>
    </CardContent>
  </Card>
)}

// Caso 2: Tiene acceso a Mi Marca
{hasBrandAccess && (
  <Link to="/mimarca">
    <Card className="border-primary/50 bg-primary/5 hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-primary" />
          <div>
            <h3 className="font-semibold">Mi Marca</h3>
            <p className="text-sm text-muted-foreground">
              Panel de administración
            </p>
          </div>
        </div>
        <ArrowRight className="h-5 w-5 text-primary" />
      </CardContent>
    </Card>
  </Link>
)}

// Caso 3: Es empleado/encargado de local(es)
{hasLocalAccess && (
  <>
    {/* Lista de sucursales CON el rol específico de cada una */}
    {userBranchRoles.map((ubr) => (
      <Card key={ubr.branch_id}>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Store className="h-6 w-6 text-muted-foreground" />
            <div>
              <span className="font-medium">{getBranchName(ubr.branch_id)}</span>
              <Badge variant="outline" className="ml-2">
                {LOCAL_ROLE_LABELS[ubr.local_role]}
              </Badge>
            </div>
          </div>
          <Link to={`/milocal/${ubr.branch_id}`}>
            <Button variant="outline" size="sm">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    ))}
    
    {/* Cards de empleado: comunicados, horarios, fichajes, etc. */}
    <MyCommunicationsCard />
    <MyScheduleCard />
    {/* ... */}
  </>
)}

// Siempre: link a perfil
<Link to="/cuenta/perfil">
  <Card>...</Card>
</Link>
```

---

## RESUMEN DE ARCHIVOS

### Nuevos archivos a crear

| Archivo | Fase | Descripción |
|---------|------|-------------|
| `src/hooks/useMonthlyHours.ts` | 2 | Cálculo de horas trabajadas |
| `src/pages/local/MonthlyHoursPage.tsx` | 2 | Vista de horas del mes |
| `src/components/admin/BranchTeamTab.tsx` | 3 | Gestión de equipo desde Mi Marca |
| `src/components/communications/ReadersModal.tsx` | 4 | Modal de lectores |
| `src/hooks/useContextualHelp.ts` | 5 | Hook del sistema de ayuda |
| `src/components/ui/PageHelp.tsx` | 5 | Banner de ayuda colapsable |
| `src/components/ui/FloatingHelpButton.tsx` | 5 | Botón "?" flotante |
| `src/lib/helpConfig.ts` | 5 | Configuración de textos de ayuda |

### Archivos a modificar

| Archivo | Fase | Cambios |
|---------|------|---------|
| `src/hooks/usePermissionsV2.ts` | 0-1 | Nueva estructura de roles por sucursal |
| `src/pages/local/TeamPage.tsx` | 2 | Agregar tabs (Personal / Horas) |
| `src/pages/admin/BranchDetail.tsx` | 3 | Agregar tabs (Info / Equipo) |
| `src/pages/admin/CommunicationsPage.tsx` | 4 | Checkbox confirmación, ver lectores |
| `src/pages/local/LocalCommunicationsPage.tsx` | 4 | Checkbox confirmación, ver lectores |
| `src/components/cuenta/MyCommunicationsCard.tsx` | 4 | Botón confirmar lectura |
| `src/pages/cuenta/CuentaDashboard.tsx` | 4, 6 | Banner urgente, UI adaptativa |
| `src/App.tsx` | 2, 5 | TooltipProvider wrapper |

---

## ORDEN DE EJECUCIÓN

```text
┌─────────────────────────────────────────────────────────────────┐
│                    SECUENCIA DE IMPLEMENTACIÓN                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. MIGRACIÓN BD (Fase 0)           ← CRÍTICO, primero         │
│     │                                                           │
│     ▼                                                           │
│  2. usePermissionsV2 (Fase 1)       ← Base para todo            │
│     │                                                           │
│     ├──────────────────┬─────────────────┐                     │
│     ▼                  ▼                 ▼                      │
│  3. Horas (Fase 2)  4. Equipo (Fase 3)  5. Comunicados (Fase 4) │
│     │                  │                 │                      │
│     └──────────────────┴─────────────────┘                     │
│                        │                                        │
│                        ▼                                        │
│              6. Sistema Ayuda (Fase 5)                          │
│                        │                                        │
│                        ▼                                        │
│              7. Mi Cuenta Adaptativa (Fase 6)                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## ESTIMACIÓN DE TIEMPO

| Fase | Descripción | Horas |
|------|-------------|-------|
| 0 | Migraciones BD | 2 |
| 1 | usePermissionsV2 | 4 |
| 2 | Vista Horas del Mes | 8 |
| 3 | Equipo por Sucursal | 8 |
| 4 | Mejoras Comunicados | 5 |
| 5 | Sistema de Ayuda | 8 |
| 6 | Mi Cuenta Adaptativa | 3 |
| | **TOTAL** | **~38 horas** |




# Plan: Corregir Políticas RLS para Reuniones de Red + Visibilidad en Mi Cuenta

## Diagnóstico

### Problemas Identificados

| Problema | Impacto |
|----------|---------|
| Política `meeting_participants_insert` falla para reuniones de red (`branch_id = NULL`) | No se pueden agregar participantes a reuniones de red |
| Política `meeting_participants_select` falla para reuniones de red | Los participantes no pueden ver sus reuniones de red |
| `MyMeetingsCard` solo muestra reuniones **CERRADAS** con notas | Los convocados no ven reuniones pendientes |

### Estado Actual del Código

1. **`MyMeetingsCard`** está correctamente integrado en `CuentaDashboard.tsx` (línea 233)
2. **Pero solo para empleados operativos** (excluye franquiciados - línea 229)
3. **El hook `useMyMeetings`** filtra solo reuniones **CERRADAS** (las que tienen notas)

---

## Cambios Requeridos

### 1. Corregir Políticas RLS de `meeting_participants`

```sql
-- INSERT: Permitir para reuniones de red (creador o superadmin/coordinador)
DROP POLICY IF EXISTS meeting_participants_insert ON meeting_participants;
CREATE POLICY "meeting_participants_insert" ON meeting_participants
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM meetings m
    WHERE m.id = meeting_participants.meeting_id
    AND (
      -- Reuniones de sucursal: HR del local
      (m.branch_id IS NOT NULL AND is_hr_role(auth.uid(), m.branch_id))
      OR
      -- Reuniones de red: creador, superadmin o coordinador
      (m.branch_id IS NULL AND (
        m.created_by = auth.uid() 
        OR is_superadmin(auth.uid()) 
        OR get_brand_role(auth.uid()) = 'coordinador'
      ))
    )
  )
);

-- SELECT: Incluir reuniones de red
DROP POLICY IF EXISTS meeting_participants_select ON meeting_participants;
CREATE POLICY "meeting_participants_select" ON meeting_participants
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR is_superadmin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM meetings m
    WHERE m.id = meeting_participants.meeting_id
    AND (
      (m.branch_id IS NOT NULL AND is_hr_role(auth.uid(), m.branch_id))
      OR 
      (m.branch_id IS NULL AND (
        m.created_by = auth.uid() 
        OR get_brand_role(auth.uid()) IN ('coordinador', 'informes', 'contador_marca')
      ))
    )
  )
);

-- UPDATE: Lo mismo para actualizar
DROP POLICY IF EXISTS meeting_participants_update ON meeting_participants;
CREATE POLICY "meeting_participants_update" ON meeting_participants
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR is_superadmin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM meetings m
    WHERE m.id = meeting_participants.meeting_id
    AND (
      (m.branch_id IS NOT NULL AND is_hr_role(auth.uid(), m.branch_id))
      OR 
      (m.branch_id IS NULL AND m.created_by = auth.uid())
    )
  )
);
```

### 2. Actualizar `MyMeetingsCard` para Mostrar Todos los Estados

El componente actual solo muestra reuniones con notas (cerradas). Debemos mostrar:

- **Reuniones CONVOCADAS**: Mostrar "Estás convocado para [fecha]"
- **Reuniones CERRADAS sin leer**: Mostrar "Confirmar lectura"

```typescript
// MyMeetingsCard.tsx - Cambiar lógica de filtrado

// Reuniones pendientes: convocadas (futuras) + cerradas sin leer
const pendingMeetings = meetings.filter(m => 
  m.status === 'convocada' || 
  (m.status === 'cerrada' && !m.myParticipation?.read_at)
);

// Mostrar badge diferente según estado
{meeting.status === 'convocada' ? (
  <Badge variant="outline">Convocado</Badge>
) : (
  <Badge variant="destructive">Sin leer</Badge>
)}
```

### 3. Mostrar `MyMeetingsCard` También a Franquiciados

Actualmente está excluido (línea 229). Los franquiciados de red también deben ver sus reuniones:

```typescript
// CuentaDashboard.tsx - Mover MyMeetingsCard fuera del bloque de empleados

{/* Communications - show only brand for franquiciados */}
<MyCommunicationsCard showOnlyBrand={isOnlyFranquiciado} />

{/* Reuniones - TODOS los que tienen rol local las ven */}
<MyMeetingsCard />

{/* Operational Cards - only for employees, NOT franquiciados */}
{!isOnlyFranquiciado && (
  <div className="grid gap-3 md:gap-4">
    <MyRegulationsCard />
    ...
  </div>
)}
```

---

## Resumen de Archivos

| Archivo | Cambio |
|---------|--------|
| Nueva migración SQL | Corregir políticas RLS de `meeting_participants` |
| `src/components/cuenta/MyMeetingsCard.tsx` | Mostrar reuniones convocadas + cerradas, con badges dinámicos |
| `src/pages/cuenta/CuentaDashboard.tsx` | Mover `MyMeetingsCard` para que franquiciados también lo vean |

---

## Orden de Implementación

1. Migración SQL para corregir políticas RLS
2. Actualizar `MyMeetingsCard` con lógica para ambos estados
3. Mover componente en `CuentaDashboard` para incluir franquiciados


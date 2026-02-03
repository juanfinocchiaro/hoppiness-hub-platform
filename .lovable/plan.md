
# Plan Completo: Solo Lectura para Franquiciados + Mejoras de Horarios

## Resumen de Problemas Detectados

Se identificaron 5 problemas principales:

| # | Problema | Causa |
|---|----------|-------|
| 1 | Franquiciado puede modificar todo | `usePermissionsV2.ts` le da mismos permisos que Encargado |
| 2 | "Mi Horario" en Mi Cuenta muestra datos incorrectos | Query usa `day_of_week` en lugar de `schedule_date` |
| 3 | "Ver horario completo" lleva a Mi Local | Empleado debería ver su propio horario, no el panel de gestión |
| 4 | Notificaciones no se envían | `InlineScheduleEditor` no llama a `sendScheduleNotification` |
| 5 | Luca ve "Franco" pero no tiene horarios | Bug de sincronización + caché de queries |

---

## PARTE 1: Modo Solo Lectura para Franquiciados

### Cambios en `usePermissionsV2.ts`

Se agregarán permisos granulares para acciones operativas que excluyen al franquiciado:

```typescript
// Nuevos permisos en localPermissions:
canCreateSalaryAdvance: hasCurrentBranchAccess && (isSuperadmin || isEncargado),
canCancelSalaryAdvance: hasCurrentBranchAccess && (isSuperadmin || isEncargado),
canCreateWarning: hasCurrentBranchAccess && (isSuperadmin || isEncargado),
canUploadSignature: hasCurrentBranchAccess && (isSuperadmin || isEncargado),
canDoCoaching: hasCurrentBranchAccess && (isSuperadmin || isEncargado),
canSendLocalCommunication: hasCurrentBranchAccess && (isSuperadmin || isEncargado),

// Modificar permisos existentes:
canEditSchedules: hasCurrentBranchAccess && (isSuperadmin || isEncargado), // Antes incluía franquiciado
canEnterSales: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isCajero), // Antes incluía franquiciado
canInviteEmployees: hasCurrentBranchAccess && (isSuperadmin || isEncargado), // Antes incluía franquiciado
canDeactivateEmployees: hasCurrentBranchAccess && (isSuperadmin || isEncargado), // Antes incluía franquiciado
```

### Componentes a Modificar

| Archivo | Cambio |
|---------|--------|
| `ManagerDashboard.tsx` | Ocultar botón "Cargar ventas" y "Hacer coaching" si `!local.canEnterSales` / `!local.canDoCoaching` |
| `AdvancesPage.tsx` | Ocultar "Registrar Adelanto" y "Cancelar" si `!local.canCreateSalaryAdvance` |
| `WarningsPage.tsx` | Ocultar "Nuevo Apercibimiento" si `!local.canCreateWarning` |
| `CoachingPage.tsx` | Ocultar formulario de evaluación si `!local.canDoCoaching` |
| `RegulationSignaturesPanel.tsx` | Ocultar "Subir firma" y "Hoja firma" si `!local.canUploadSignature` |
| `LocalCommunicationsPage.tsx` | Ocultar "Nuevo Mensaje" y "Eliminar" si `!local.canSendLocalCommunication` |
| `TeamPage.tsx` | Ocultar "Invitar empleado" si `!local.canInviteEmployees` |
| `InlineScheduleEditor.tsx` | Modo solo lectura si `!local.canEditSchedules` (sin copiar/pegar/editar celdas) |

---

## PARTE 2: Corregir "Mi Horario" en Mi Cuenta

### Problema Actual

El componente `MyScheduleCard.tsx` busca por `day_of_week`:
```typescript
const daySchedules = schedules?.filter(s => s.day_of_week === dayOfWeek) || [];
```

Pero los horarios se guardan con `schedule_date`. Entonces si no hay horarios para el mes, muestra "Franco" para todos basándose en el `day_of_week` de registros antiguos o inexistentes.

### Solución

Reescribir `MyScheduleCard.tsx` para:
1. Usar `schedule_date` en el query, no `day_of_week`
2. Agregar navegación mes a mes
3. Priorizar visualización: HOY → Semana → Mes
4. Mostrar posición de trabajo asignada
5. Si no hay horarios, mostrar "Sin horario publicado"

### Nueva Estructura de MyScheduleCard

```typescript
// Query corregido usando schedule_date
const { data: schedules } = useQuery({
  queryKey: ['my-schedules-v2', userId, currentMonth, currentYear],
  queryFn: async () => {
    const startDate = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(new Date(year, month - 1, 1)), 'yyyy-MM-dd');
    
    const { data } = await supabase
      .from('employee_schedules')
      .select('id, schedule_date, start_time, end_time, is_day_off, work_position')
      .eq('user_id', userId)
      .gte('schedule_date', startDate)
      .lte('schedule_date', endDate);
    return data || [];
  },
});

// Crear mapa por fecha para lookup eficiente
const schedulesByDate = useMemo(() => {
  const map = new Map<string, ScheduleEntry>();
  schedules?.forEach(s => map.set(s.schedule_date, s));
  return map;
}, [schedules]);
```

### Nuevo UI para "Mi Horario"

```
┌──────────────────────────────────────────────────────┐
│ 📅 Mi Horario                          < Feb 2026 > │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │ HOY - Martes 3                                 │ │
│  │ 🔥 Sandwichero                                 │ │
│  │ ⏰ 19:00 - 00:00                    [Trabajás] │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  Esta semana:                                        │
│  ┌────┬────┬────┬────┬────┬────┬────┐               │
│  │ L  │ M  │ X  │ J  │ V  │ S  │ D  │               │
│  │3✓ │ 4  │ 5  │ 6  │ 7F │ 8F │ 9  │               │
│  └────┴────┴────┴────┴────┴────┴────┘               │
│                                                      │
│  [Ver mes completo ▼]                               │
│                                                      │
│  (Expandible: calendario del mes con horarios)     │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Cambios en comportamiento

- "Ver horario completo" ahora expande un calendario inline en lugar de navegar a Mi Local
- Cada día muestra: horario + posición asignada
- Indicador visual para Francos (F) y días trabajados (✓)
- Si no hay horarios publicados: "Tu encargado aún no publicó los horarios de este mes"

---

## PARTE 3: Página Propia de Horarios para Empleados

### Problema

"Ver horario completo" lleva a `/milocal` pero un empleado sin acceso a Mi Local no puede verlo.

### Solución

Crear nueva página `/cuenta/horario` para vista personal del empleado:

| Ruta | Acceso | Contenido |
|------|--------|-----------|
| `/milocal/:id/equipo/horarios` | Encargado | Grilla de edición de todo el equipo |
| `/cuenta/horario` | Empleado | Solo su horario personal (solo lectura) |

### Archivo Nuevo: `src/pages/cuenta/MiHorarioPage.tsx`

```typescript
// Componente que muestra:
// - Calendario mensual completo del empleado
// - Navegación mes a mes
// - Vista de semana con detalle por día
// - Indicador de hoy prominente
// - Sin capacidad de edición
```

### Modificar Router

Agregar ruta protegida:
```typescript
<Route path="/cuenta/horario" element={<RequireAuth><MiHorarioPage /></RequireAuth>} />
```

### Modificar `MyScheduleCard.tsx`

Cambiar el link:
```typescript
// Antes
<Link to="/milocal">

// Después  
<Link to="/cuenta/horario">
```

---

## PARTE 4: Arreglar Notificaciones de Horarios

### Problema

`InlineScheduleEditor` guarda horarios con una mutation inline que **NO llama** a `sendScheduleNotification`. Las notificaciones solo se envían si se usa `useSaveMonthlySchedule` del hook.

### Solución

Modificar el `onSuccess` de la mutation en `InlineScheduleEditor` para:

1. Después de guardar, llamar a `sendScheduleNotification` por cada usuario afectado si `notifyEmail` o `notifyCommunication` están activados
2. También invalidar el query `my-schedules-v2` que usa `MyScheduleCard`

```typescript
// En InlineScheduleEditor.tsx saveMutation.onSuccess:
onSuccess: async (_, { notifyEmail, notifyCommunication }) => {
  // Enviar notificaciones a cada empleado afectado
  if (notifyEmail || notifyCommunication) {
    for (const employee of affectedEmployees) {
      await sendScheduleNotification({
        user_id: employee.id,
        branch_id: branchId,
        month,
        year,
        is_modification: false, // o detectar si es modificación
        notify_email: notifyEmail,
        notify_communication: notifyCommunication,
        sender_id: currentUserId,
      });
    }
  }
  
  // Invalidar todos los queries relacionados
  queryClient.invalidateQueries({ queryKey: ['monthly-schedules'] });
  queryClient.invalidateQueries({ queryKey: ['my-schedules-v2'] });
  queryClient.invalidateQueries({ queryKey: ['employee-schedule'] });
  // ...
}
```

### Exportar función helper

Mover `sendScheduleNotification` de `useSchedules.ts` a un archivo separado o exportarlo para que `InlineScheduleEditor` pueda usarlo.

---

## PARTE 5: Arreglar Bug de Sincronización de Horarios

### Problema

`MyScheduleCard` muestra horarios que no existen en la DB porque:
1. El query no invalida correctamente al guardar/eliminar
2. El staleTime de 30s mantiene datos viejos

### Solución

1. En `useDeleteMonthSchedule`, agregar invalidación del query `my-schedules-v2`:
```typescript
onSuccess: (_, variables) => {
  queryClient.invalidateQueries({ queryKey: ['monthly-schedules', variables.branchId] });
  queryClient.invalidateQueries({ queryKey: ['employee-schedule', variables.userId] });
  queryClient.invalidateQueries({ queryKey: ['my-schedules-v2', variables.userId] });
  queryClient.invalidateQueries({ queryKey: ['has-published-schedule', variables.userId] });
},
```

2. Reducir staleTime a 10s o usar `refetchOnWindowFocus: true` para datos más frescos

---

## Resumen de Archivos a Modificar

| Archivo | Cambios |
|---------|--------|
| `src/hooks/usePermissionsV2.ts` | Agregar permisos granulares, excluir franquiciado de edición |
| `src/components/local/ManagerDashboard.tsx` | Condicionar botones de acción |
| `src/pages/local/AdvancesPage.tsx` | Condicionar botones de acción |
| `src/pages/local/WarningsPage.tsx` | Condicionar botones de acción |
| `src/pages/local/CoachingPage.tsx` | Modo solo lectura para franquiciado |
| `src/components/local/RegulationSignaturesPanel.tsx` | Condicionar botones de firma |
| `src/pages/local/LocalCommunicationsPage.tsx` | Condicionar botones de acción |
| `src/pages/local/TeamPage.tsx` | Condicionar invitación |
| `src/components/hr/InlineScheduleEditor.tsx` | 1) Modo solo lectura. 2) Llamar sendScheduleNotification. 3) Invalidar queries |
| `src/components/cuenta/MyScheduleCard.tsx` | Reescribir con schedule_date, navegación mes, vista expandible |
| `src/pages/cuenta/MiHorarioPage.tsx` | **NUEVO** - Página personal de horarios del empleado |
| `src/hooks/useSchedules.ts` | Exportar sendScheduleNotification, invalidar my-schedules-v2 |
| `src/App.tsx` | Agregar ruta /cuenta/horario |

---

## Resultado Esperado

### Para María Eugenia (Franquiciada)
- Ve todo en Mi Local pero no puede modificar nada
- No ve botones de "Cargar", "Hacer Coaching", "Registrar", "Invitar"
- Los horarios se muestran solo lectura sin controles de copiar/pegar

### Para Luca Lipiñski (Empleado)
- "Mi Horario" en Mi Cuenta muestra datos reales de la DB
- Si no hay horarios publicados, ve mensaje informativo
- "Ver horario completo" abre su página personal `/cuenta/horario`
- Recibe notificaciones cuando le publican o modifican horarios
- Ve su posición asignada (ej: "Sandwichero") en cada turno

### Para el Encargado
- Las notificaciones se envían correctamente al guardar horarios
- Los cambios se reflejan inmediatamente en el dashboard del empleado

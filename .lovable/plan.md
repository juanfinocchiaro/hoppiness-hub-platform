
# Plan: Mejorar Vista de Equipo en Mi Marca con Coaching Integrado

## Resumen del Cambio

Mejorar `BranchTeamTab.tsx` (usado en Mi Marca > Locales > Detalle > Equipo) para que:
1. Muestre jerarquía visual clara (Propietarios > Encargados > Staff)
2. Muestre estado de coaching de todos los miembros
3. Permita al Coordinador hacer coaching **solo a encargados**
4. Permita al Coordinador **ver** los coachings que los encargados hicieron al staff

---

## Lógica de Permisos de Coaching

| Rol del Evaluador | Puede Evaluar | Puede Ver |
|-------------------|---------------|-----------|
| **Coordinador/Superadmin** | Solo Encargados | Todos los coachings del local |
| **Encargado** | Staff (cajero, empleado) | Coachings de su equipo |
| **Franquiciado** | Nadie (es dueño) | Coachings de su local |

---

## Diseño de la Nueva Interfaz

```text
┌─────────────────────────────────────────────────────────────────┐
│  Equipo de General Paz                         Febrero 2026    │
├─────────────────────────────────────────────────────────────────┤
│  📊 Coachings del mes: 5/8 completados                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🏠 PROPIETARIOS                                                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 👤 María González        Franquiciada                     │  │
│  │    maria@email.com                                        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  👔 ENCARGADOS                                     2/2 ✓        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 👤 Juan Pérez            Encargado                        │  │
│  │    juan@email.com        Coaching: ✓ Feb 2026 (4.2/4)     │  │
│  │                          Evaluado por: Admin Central      │  │
│  │                          [Ver Detalle]                    │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 👤 Ana López             Encargada                        │  │
│  │    ana@email.com         Coaching: ⏳ Pendiente           │  │
│  │                          [Evaluar >]  ← Solo Coordinador  │  │
│  │   ┌─────────────────────────────────────────────────────┐ │  │
│  │   │      [Formulario de Coaching Expandido]             │ │  │
│  │   └─────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  👥 EQUIPO                                         3/5          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Nombre       │ Rol      │ Posición │ Coaching             │  │
│  ├──────────────┼──────────┼──────────┼──────────────────────┤  │
│  │ Carlos R.    │ Cajero   │ Caja     │ ✓ 3.8 por Juan P.    │  │
│  │ Laura M.     │ Empleado │ Cocina   │ ✓ 4.0 por Ana L.     │  │
│  │ Pedro S.     │ Empleado │ Runner   │ ⏳ Pendiente         │  │
│  │ ... (expand para ver historial)                           │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Interacciones

### Para Encargados (en Staff):
- **Click en fila** → Expande y muestra historial de coachings con quién lo evaluó
- **Solo lectura** desde Mi Marca (Coordinador no evalúa staff directo)

### Para Encargados (la persona):
- **Click en "Evaluar"** → Expande formulario de coaching (solo si eres Coordinador/Superadmin)
- **Click en "Ver Detalle"** → Muestra el coaching completo con scores

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/admin/BranchTeamTab.tsx` | Refactorización completa |

## Archivos a Crear

| Archivo | Propósito |
|---------|-----------|
| `src/components/admin/BranchTeamMemberRow.tsx` | Fila de miembro con estado de coaching |
| `src/components/admin/BranchCoachingPreview.tsx` | Vista resumen de coaching realizado |

---

## Detalles Técnicos

### Query Mejorada

```typescript
// 1. Obtener equipo del local
const { data: team } = await supabase
  .from('user_branch_roles')
  .select(`user_id, local_role, default_position`)
  .eq('branch_id', branchId)
  .eq('is_active', true);

// 2. Obtener coachings del mes actual
const currentMonth = new Date().getMonth() + 1;
const currentYear = new Date().getFullYear();

const { data: monthCoachings } = await supabase
  .from('coachings')
  .select(`
    id, user_id, overall_score, coaching_date, 
    evaluated_by, acknowledged_at
  `)
  .eq('branch_id', branchId)
  .eq('coaching_month', currentMonth)
  .eq('coaching_year', currentYear);

// 3. Obtener perfiles (incluir evaluadores)
const allUserIds = [
  ...team.map(t => t.user_id),
  ...monthCoachings.map(c => c.evaluated_by)
];
const { data: profiles } = await supabase
  .from('profiles')
  .select('id, full_name, email, avatar_url')
  .in('id', allUserIds);
```

### Agrupación de Miembros

```typescript
const grouped = {
  propietarios: team.filter(m => m.local_role === 'franquiciado'),
  encargados: team.filter(m => m.local_role === 'encargado'),
  staff: team.filter(m => 
    ['cajero', 'empleado', 'contador_local'].includes(m.local_role)
  ),
};
```

### Lógica de "Puede Evaluar"

```typescript
const canEvaluateManager = (memberRole: string) => {
  // Solo Coordinador o Superadmin pueden evaluar encargados
  return (isCoordinador || isSuperadmin) && memberRole === 'encargado';
};

const canEvaluateStaff = (memberRole: string) => {
  // Desde Mi Marca, el coordinador NO evalúa staff directamente
  // Solo puede VER los coachings que hicieron los encargados
  return false;
};
```

### Mostrar Info del Evaluador

Para cada coaching, se mostrará:
- Score obtenido (ej: 3.8/4)
- Nombre del evaluador (ej: "Por: Juan Pérez")
- Fecha del coaching
- Badge de confirmación si el empleado lo leyó

---

## Estados de Coaching

| Estado | Visual | Descripción |
|--------|--------|-------------|
| `completado` | ✓ Verde + Score | Tiene coaching este mes |
| `pendiente` | ⏳ Amarillo | No tiene coaching este mes |
| `sin_confirmar` | Badge naranja | Coaching hecho pero no leído |

---

## Beneficios

1. **Visibilidad total**: Coordinador ve de un vistazo quién falta evaluar
2. **Jerarquía clara**: Propietarios, encargados y staff diferenciados
3. **Trazabilidad**: Se ve quién hizo cada coaching al staff
4. **Flujo correcto**: Coordinador solo evalúa encargados, staff es evaluado por encargados
5. **Una sola vista**: Todo desde Mi Marca sin cambiar de panel

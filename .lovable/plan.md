

# Plan: Simplificar Vista de Equipo en Mi Marca

## Problema Identificado

La vista de **Equipo** dentro de `/mimarca/locales/:slug` muestra información de coaching que es redundante porque ya existen páginas dedicadas:

| Función | Página Dedicada | Redundancia en Equipo |
|---------|-----------------|----------------------|
| Evaluar encargados | `/mimarca/coaching/encargados` | Botón "Evaluar" + badge "Pendiente" |
| Ver coachings staff | `/mimarca/coaching/red` | Contadores 0/3, 0/2 |
| Estado mensual | Ambas páginas | Card "Coachings del mes: 0/5" |

## Solución Propuesta

Simplificar `BranchTeamTab.tsx` para que sea únicamente una vista de **gestión de personal** (altas/bajas/roles), similar a `TeamPage.tsx` de Mi Local.

### Cambios en `BranchTeamTab.tsx`

| Elemento Actual | Acción |
|-----------------|--------|
| Card "Coachings del mes: X/X completados" | **Eliminar** |
| Badge con contadores 0/2, 0/3 en headers | **Eliminar** |
| Badge "Pendiente" en cada miembro | **Eliminar** |
| Botón "Evaluar" | **Eliminar** |
| Botón "Ver" coaching | **Eliminar** |
| Consulta de tabla `coachings` | **Eliminar** |
| Mes/año en header | **Eliminar** |

### Vista Resultante (Solo Gestión)

```text
┌─────────────────────────────────────────────────┐
│  Equipo de Nueva Córdoba                        │
│  ┌───────────────────────────────────────────┐  │
│  │ 🔍 Buscar por email para agregar...       │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 🏠 Propietarios                                 │
├─────────────────────────────────────────────────┤
│ I  Ismael Sanchez                 [Franquiciado]│
│    isanfundaro@gmail.com                        │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 💼 Encargados                                   │
├─────────────────────────────────────────────────┤
│ G  Guadalupe Malizia    [Encargado/a] [Editar ▾]│
│ L  Lucía Aste           [Encargado/a] [Editar ▾]│
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 👥 Equipo                                       │
├─────────────────────────────────────────────────┤
│ F  Francisco Pavón      [Cajero]      [Editar ▾]│
│ A  Agustin Gomez        [Empleado]    [Editar ▾]│
│ C  Carolina Medina      [Empleado]    [Editar ▾]│
└─────────────────────────────────────────────────┘
```

### Funcionalidades que Permanecen

1. Buscar usuarios por email para agregar
2. Listar miembros agrupados por rol
3. Editar rol/posición (expandir fila)
4. Dar de baja miembro
5. Modal para agregar nuevo miembro

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/admin/BranchTeamTab.tsx` | Eliminar coaching, simplificar UI |
| `src/components/admin/BranchTeamMemberRow.tsx` | **Eliminar** (ya no se usa) |
| `src/components/admin/BranchCoachingPreview.tsx` | **Eliminar** (ya no se usa) |

---

## Detalle Técnico

### En `BranchTeamTab.tsx`:

**Query simplificada** (líneas 65-131):
- Eliminar consulta a tabla `coachings`
- Eliminar lógica de `coachingMap`
- Solo obtener `user_branch_roles` + `profiles`

**Eliminar elementos UI**:
- Card con estadísticas de coaching (líneas 306-318)
- Badge con mes/año (línea 302)
- Contadores en headers de sección (líneas 401-404, 436-439)
- Reemplazar `BranchTeamMemberRow` por filas simples tipo `TeamCardList`

**Agregar funcionalidad de edición**:
- Botón "Editar" que expande para cambiar rol/posición
- Botón "Dar de baja" con confirmación

---

## Resultado

- Vista limpia enfocada en **gestión de personal**
- Sin duplicación de funcionalidades de coaching
- Coaching se gestiona únicamente desde las rutas dedicadas:
  - `/mimarca/coaching/encargados`
  - `/mimarca/coaching/red`

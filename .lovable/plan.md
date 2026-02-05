
# Plan: Unificar y Clarificar Vistas de Usuarios

## Problema Actual
Las tablas de "Mi Equipo" y "Usuarios" mezclan conceptos diferentes y no permiten ver rápidamente los permisos de una persona:
- **"Rol"** se usa para dos cosas diferentes (permisos de sistema y función operativa)
- No queda claro si alguien tiene acceso a Mi Marca, Mi Local, o ambos
- La posición predefinida (Cajero operativo, Sandwichero, etc.) no se muestra

## Solución Propuesta

### Vista 1: Mi Equipo (Mi Local)

**Columnas nuevas:**
| Ingreso | Nombre | Email | Permisos | Posición | Horas mes | Últ. fichaje | Estado |
|---------|--------|-------|----------|----------|-----------|--------------|--------|
| 02/02/26 | Camilo Jané | cmartin... | Empleado | Sandwichero | 0h | - | Fuera |
| 02/02/26 | Maitena Pereyra | maitena... | Cajero | Cajera | 0h | - | Fuera |
| 02/02/26 | Valentina Reginelli | 4lorema... | Encargado | - | 0h | - | Fuera |

- **Permisos**: El local_role (determina qué puede hacer en el sistema)
- **Posición**: El default_position (su función operativa habitual)

---

### Vista 2: Usuarios (Mi Marca)

**Columnas nuevas:**
| Registro | Nombre | Email | Mi Marca | Mi Local | Posición | Sucursales |
|----------|--------|-------|----------|----------|----------|------------|
| 04/02/26 | Kiara Guadalupe | kiara... | - | - | - | - |
| 03/02/26 | agustin gomez | agustin... | - | Empleado | Sandwichero | 1 local |
| 03/02/26 | Maria Eugenia | maria... | - | Franquiciado | - | 1 local |
| 01/02/26 | guadalupe malizia | guada... | - | Encargado | - | 1 local |
| 01/02/26 | Juan (superadmin) | juan... | Superadmin | - | - | Todas |

- **Mi Marca**: El brand_role (acceso al panel central)
- **Mi Local**: El local_role de mayor jerarquía
- **Posición**: Rol operativo predefinido (si existe)
- **Sucursales**: Cantidad o indicador visual

---

### Indicadores Visuales Mejorados
En lugar de puntos grises, usar badges más claros:
- ✅ Badge con nombre del permiso cuando existe
- `-` cuando no tiene ese tipo de acceso
- En Sucursales: "1 local", "2 locales", "Todas" (para superadmin)

---

## Cambios Técnicos

### Archivos a modificar:

1. **`src/components/local/team/TeamTable.tsx`**
   - Renombrar columna "Rol" → "Permisos"
   - Agregar columna "Posición" mostrando `default_position` usando `useWorkPositions()`
   - Mantener estilos de color según nivel de permiso

2. **`src/components/admin/users/UsersTable.tsx`**
   - Reorganizar columnas: Registro | Nombre | Email | Mi Marca | Mi Local | Posición | Sucursales
   - Mostrar `brand_role` como texto (no como indicador)
   - Mostrar `primaryLocalRole` como texto
   - Agregar columna "Posición" (si tiene algún rol local con posición)
   - Sucursales: mostrar conteo legible

3. **`src/components/admin/users/types.ts`**
   - Agregar labels para posiciones (opcional, ya existe `useWorkPositions`)

4. **`src/components/local/team/types.ts`**
   - Ya tiene `LOCAL_ROLE_LABELS`, renombrar para claridad conceptual

---

## Resultado Visual Esperado

### Mi Equipo (Mi Local):
```text
┌─────────┬──────────────────┬─────────────────────┬───────────┬─────────────┬───────────┬─────────────┬─────────┐
│ Ingreso │ Nombre           │ Email               │ Permisos  │ Posición    │ Horas mes │ Últ. fichaje│ Estado  │
├─────────┼──────────────────┼─────────────────────┼───────────┼─────────────┼───────────┼─────────────┼─────────┤
│ 02/02/26│ Camilo Jané      │ cmartin...          │ Empleado  │ Sandwichero │ 0h        │ -           │ ● Fuera │
│ 02/02/26│ Maitena Pereyra  │ maitena...          │ Cajero    │ Cajera      │ 0h        │ -           │ ● Fuera │
│ 02/02/26│ Valentina        │ 4lorema...          │ Encargado │ -           │ 0h        │ -           │ ● Fuera │
└─────────┴──────────────────┴─────────────────────┴───────────┴─────────────┴───────────┴─────────────┴─────────┘
```

### Usuarios (Mi Marca):
```text
┌──────────┬──────────────────┬─────────────────────┬────────────┬────────────┬─────────────┬───────────┐
│ Registro │ Nombre           │ Email               │ Mi Marca   │ Mi Local   │ Posición    │ Sucursales│
├──────────┼──────────────────┼─────────────────────┼────────────┼────────────┼─────────────┼───────────┤
│ 04/02/26 │ Kiara Guadalupe  │ kiara...            │ -          │ -          │ -           │ -         │
│ 03/02/26 │ agustin gomez    │ agustin...          │ -          │ Empleado   │ Sandwichero │ 1 local   │
│ 03/02/26 │ Maria Eugenia    │ maria...            │ -          │ Franquiciado│ -          │ 1 local   │
│ 01/02/26 │ Juan Pérez       │ juan...             │ Superadmin │ -          │ -           │ Todas     │
└──────────┴──────────────────┴─────────────────────┴────────────┴────────────┴─────────────┴───────────┘
```

---

## Beneficios
1. **Claridad conceptual**: Separar "permisos" (qué puede hacer) de "posición" (qué función cumple)
2. **Visibilidad rápida**: Ver de un vistazo todos los accesos de alguien
3. **Consistencia**: Ambas vistas usan terminología similar
4. **Sin puntos grises confusos**: Texto claro "-" o el valor real

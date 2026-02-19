

# Sistema de 3 Cajas por Local

## Concepto

Cada local tendra exactamente 3 cajas con reglas de visibilidad diferenciadas por rol:

| Caja | Cajero | Encargado | Contador Local | Franquiciado | Superadmin |
|---|---|---|---|---|---|
| **Caja de Ventas** | Ve saldo + movimientos | Ve saldo + movimientos | Ve todo | Ve todo | Ve todo |
| **Caja de Alivio** | Ve cantidad de depositos, NO saldo | Ve cantidad de depositos, NO saldo | Ve saldo + movimientos | Ve saldo + movimientos | Ve saldo + movimientos |
| **Caja Fuerte** | No ve nada | No ve nada | Ve saldo + movimientos | Ve saldo + movimientos | Ve saldo + movimientos |

---

## Parte 1: Base de Datos

### Cambio en `cash_registers`

Agregar columna `register_type` con 3 valores posibles:

- `ventas` - Caja de Ventas (donde entran las ventas del POS)
- `alivio` - Caja de Alivio (depositos desde Caja de Ventas)
- `fuerte` - Caja Fuerte (retiros del franquiciado desde Alivio)

```sql
ALTER TABLE cash_registers ADD COLUMN register_type TEXT DEFAULT 'ventas';
```

### Seed: Crear las 3 cajas para cada local

Para cada sucursal activa, insertar Caja de Alivio y Caja Fuerte (ya tienen "Caja 1" que se renombra a "Caja de Ventas"). Actualizar la existente y crear las 2 faltantes.

### RLS

La RLS actual (`has_branch_access_v2`) permite acceso a nivel de sucursal. La restriccion de visibilidad de saldos se implementa en el **frontend** (no en RLS), porque el dato si necesita ser accesible para calculos - solo se oculta la visualizacion.

---

## Parte 2: Logica de Negocio

### Flujo de dinero

```
Ventas POS --> [Caja de Ventas]
                    |
                    | (Alivio: cajero/encargado)
                    v
              [Caja de Alivio]
                    |
                    | (Retiro: solo franquiciado)
                    v
              [Caja Fuerte]
```

### Operaciones por caja

**Caja de Ventas:**
- Recibe: ingresos automaticos de ventas POS, ingresos manuales
- Sale: egresos manuales, alivios hacia Caja de Alivio
- Se abre y cierra por turno (como funciona ahora)

**Caja de Alivio:**
- Recibe: depositos desde Caja de Ventas (alivios)
- Sale: retiros hacia Caja Fuerte (solo franquiciado)
- No tiene apertura/cierre de turno, es un acumulador perpetuo
- Cajeros y encargados solo ven "3 depositos realizados" sin monto total

**Caja Fuerte:**
- Recibe: retiros desde Caja de Alivio
- Sale: retiros finales del franquiciado (llevar efectivo)
- Solo visible para franquiciado, contador local y superadmin
- Acumulador perpetuo sin turno

---

## Parte 3: Cambios en el Frontend

### Hook `useCashRegister.ts`

- Nueva funcion `useCashRegistersByType(branchId)` que retorna `{ ventas, alivio, fuerte }` separados por tipo
- Funcion helper `canViewRegisterBalance(registerType, localRole)` que determina si el usuario puede ver saldos
- Funcion helper `canViewRegisterMovements(registerType, localRole)` para movimientos

### Pagina `RegisterPage.tsx` (reescritura)

La pagina actual solo muestra la Caja de Ventas. Se redisena con 3 secciones:

**Seccion 1: Caja de Ventas** (visible para todos)
- Igual que ahora: abrir/cerrar turno, ver saldo, movimientos, ingreso/egreso
- Boton "Alivio" que transfiere a Caja de Alivio (como ya funciona)

**Seccion 2: Caja de Alivio** (siempre visible, datos restringidos)
- Para cajero/encargado: card que muestra "X depositos realizados hoy" sin montos
- Para franquiciado/contador/superadmin: card con saldo total, lista de movimientos, boton "Retirar a Caja Fuerte"

**Seccion 3: Caja Fuerte** (solo visible para franquiciado/contador/superadmin)
- Card con saldo acumulado
- Lista de retiros con fecha y monto
- Boton "Registrar Retiro" (franquiciado marca que se llevo el efectivo)

### Logica de Alivio (actualizar)

El alivio actual ya busca una caja con nombre "alivio". Se mejora para usar `register_type = 'alivio'` en vez de buscar por nombre. La Caja de Alivio no necesita turno abierto - los depositos se registran directamente como movimientos con un shift perpetuo o sin shift.

### Logica de Retiro a Caja Fuerte (nuevo)

- Solo franquiciado puede ejecutar
- Registra withdrawal en Caja de Alivio y deposit en Caja Fuerte
- Modal simple: monto + nota opcional

---

## Parte 4: Archivos a modificar/crear

### Modificar

| Archivo | Cambio |
|---|---|
| `src/hooks/useCashRegister.ts` | Agregar `register_type` al tipo, helper de visibilidad por rol, `useCashRegistersByType` |
| `src/pages/pos/RegisterPage.tsx` | Redisenar con 3 secciones y reglas de visibilidad |
| `src/components/pos/RegisterOpenModal.tsx` | Filtrar solo cajas tipo `ventas` en el selector |

### Crear

| Archivo | Descripcion |
|---|---|
| `src/components/pos/CajaAlivioCard.tsx` | Card de Caja de Alivio con vista restringida |
| `src/components/pos/CajaFuerteCard.tsx` | Card de Caja Fuerte (solo roles altos) |
| `src/components/pos/RetiroAlivioModal.tsx` | Modal para retirar de Alivio a Fuerte |

### Migracion SQL

Una migracion que:
1. Agrega `register_type` a `cash_registers`
2. Actualiza las cajas existentes ("Caja 1") a tipo `ventas` con nombre "Caja de Ventas"
3. Inserta Caja de Alivio y Caja Fuerte para cada sucursal
4. Agrega campo opcional `source_register_id` a `cash_register_movements` para trazabilidad de transferencias entre cajas

---

## Parte 5: Detalle tecnico de visibilidad

La visibilidad se controla en el frontend usando `localRole` del hook `useDynamicPermissions`:

```typescript
function canViewBalance(registerType: string, localRole: string | null): boolean {
  if (registerType === 'ventas') return true; // todos ven
  if (registerType === 'alivio') return ['franquiciado', 'contador_local'].includes(localRole);
  if (registerType === 'fuerte') return ['franquiciado', 'contador_local'].includes(localRole);
  return false;
}

function canViewSection(registerType: string, localRole: string | null): boolean {
  if (registerType === 'ventas') return true;
  if (registerType === 'alivio') return true; // todos ven la seccion, pero con datos restringidos
  if (registerType === 'fuerte') return ['franquiciado', 'contador_local'].includes(localRole);
  return false;
}
```

Superadmin siempre ve todo (bypass completo).


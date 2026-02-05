# ANÁLISIS DE BUGS Y FUNCIONES INCOMPLETAS - HOPPINESS HUB

**Fecha de análisis:** Febrero 2026  
**Analizado por:** Auditoría automatizada

---

## RESUMEN EJECUTIVO

| Categoría | Cantidad | Severidad |
|-----------|----------|-----------|
| TODOs/FIXMEs en código | 4 | Media |
| Errores de ESLint | 64 | Alta |
| Warnings de ESLint | 16 | Media |
| Funciones "Próximamente" | 6+ | Media |
| Funciones sin implementar | 3+ | Alta |
| Console.logs en producción | 30+ | Baja |

---

## 1. TODO/FIXME ENCONTRADOS EN EL CÓDIGO

### 1.1 TODOs Activos

| Archivo | Línea | Descripción | Prioridad |
|---------|-------|-------------|-----------|
| `src/components/hr/PendingScheduleRequests.tsx` | 124 | "Create automatic communication to notify the employee" - Falta notificar automáticamente al empleado cuando se aprueba/rechaza una solicitud | Media |
| `src/components/coaching/CoachingForm.tsx` | 132 | "Implementar cambios de certificación" - El array certificationChanges siempre está vacío | Media |
| `src/hooks/useLaborHours.ts` | 372 | "obtener de employee_data cuando exista" - El contractType está hardcodeado como '0% BLANCO' | Alta |
| `src/hooks/useEffectiveUser.ts` | 7 | Comentario de documentación, no es un TODO real | - |

### 1.2 Impacto de los TODOs

**`useLaborHours.ts` - contractType hardcodeado:**
```typescript
contractType: '0% BLANCO', // TODO: obtener de employee_data cuando exista
```
- **Impacto:** Todos los empleados aparecen con el mismo tipo de contrato en reportes de horas laborales
- **Solución:** Obtener el tipo de contrato desde la tabla `employee_data` o `employees`

**`CoachingForm.tsx` - Cambios de certificación:**
```typescript
certificationChanges: [], // TODO: Implementar cambios de certificación
```
- **Impacto:** No se pueden registrar cambios en las certificaciones de estaciones cuando se hace un coaching
- **Solución:** Agregar UI para seleccionar cambios de nivel de certificación

**`PendingScheduleRequests.tsx` - Notificación automática:**
```typescript
// TODO: Create automatic communication to notify the employee
```
- **Impacto:** El empleado no recibe notificación cuando su solicitud es aprobada/rechazada
- **Solución:** Llamar a la función de crear comunicación interna después de actualizar el status

---

## 2. ERRORES DE ESLINT (64 errores)

### 2.1 Errores por Tipo

| Tipo de Error | Cantidad | Archivos Afectados |
|---------------|----------|-------------------|
| `@typescript-eslint/no-explicit-any` | 45+ | Múltiples archivos |
| `prefer-const` | 10+ | Varios hooks y páginas |
| `@typescript-eslint/no-empty-object-type` | 2 | UI components |
| `react-hooks/exhaustive-deps` | 5 | Varios componentes |
| `@typescript-eslint/no-require-imports` | 1 | tailwind.config.ts |

### 2.2 Archivos con Más Errores

1. **`src/components/hr/InlineScheduleEditor.tsx`** - 6 errores de `any`
2. **`src/components/admin/BranchEditPanel.tsx`** - 5 errores de `any`
3. **`src/hooks/useSalaryAdvances.ts`** - 4 errores de `prefer-const`
4. **`src/components/admin/BranchTeamTab.tsx`** - 4 errores de `any`
5. **`src/types/shiftClosure.ts`** - 3 errores de `any`

### 2.3 Warnings de React Hooks

| Archivo | Línea | Dependencias Faltantes |
|---------|-------|----------------------|
| `src/components/cuenta/MyScheduleCard.tsx` | 100 | `now` |
| `src/components/hr/ScheduleCellPopover.tsx` | 132 | `breakEnd`, `breakStart` |
| `src/components/hr/schedule-selection/useScheduleSelection.ts` | 95 | Múltiples handlers |
| `src/components/maps/BranchLocationMap.tsx` | 71 | `latitude`, `longitude` |
| `src/pages/ResetPassword.tsx` | 102 | `isValidSession` |
| `src/pages/cuenta/MiHorarioPage.tsx` | 103 | `now` |

---

## 3. FUNCIONES "PRÓXIMAMENTE" (SIN IMPLEMENTAR)

### 3.1 Features Marcadas como "Próximamente"

| Feature | Ubicación | Descripción |
|---------|-----------|-------------|
| Descargar PDF de apercibimientos | `WarningsReport.tsx:74` | Botón deshabilitado con texto "próximamente" |
| Liquidación de empleados | `EmployeeExpandedRow.tsx:297` | Toast indica que está "próximamente" |
| Locales próximamente | `LocationsSection.tsx:53-192` | Sección para mostrar locales que abrirán |
| Sucursales "Próximamente" | `BranchDetail.tsx:15` | Badge para sucursales en construcción |
| Editar datos sucursal | `BranchEditPanel.tsx:227` | Toggle "Próximamente" para locales nuevos |

### 3.2 Features Parcialmente Implementadas

| Feature | Estado | Faltante |
|---------|--------|----------|
| **Facturación AFIP** | Edge function existe | UI completa de gestión de facturas |
| **Impresoras** | UI de configuración existe | No hay integración real con impresoras |
| **Integraciones Rappi/PedidosYa/MP Delivery** | Solo flags en BD | No hay conexión con APIs |
| **Recuperar contraseña** | Página existe (`OlvidePassword.tsx`) | Verificar flujo completo |

---

## 4. CONSOLE.LOGS EN PRODUCCIÓN

Se encontraron **30+ console.log/error/warn** en el código. Aunque muchos están protegidos con `import.meta.env.DEV`, algunos no lo están:

### 4.1 Console.logs NO protegidos (potencial leak en producción)

| Archivo | Línea | Tipo |
|---------|-------|------|
| `src/components/cuenta/MySalaryAdvancesCard.tsx` | 44 | `console.warn` |
| `src/pages/NotFound.tsx` | 8 | `console.warn` |
| `src/pages/FichajeEmpleado.tsx` | 231 | `console.warn` |
| `src/hooks/useScheduleNotifications.ts` | 57, 111, 129 | `console.error` |
| `src/hooks/useCommunications.ts` | 66 | `console.error` |
| `src/pages/ResetPassword.tsx` | 27, 30, 44, 61, 64, 88 | `console.log/error` |

### 4.2 Recomendación

Envolver todos los console.* con:
```typescript
if (import.meta.env.DEV) console.log(...);
```

O usar el errorHandler existente en `src/lib/errorHandler.ts`:
```typescript
import { devLog, devWarn } from '@/lib/errorHandler';
devLog('mensaje');
```

---

## 5. BUGS POTENCIALES

### 5.1 Bug: CSS @import después de otras reglas

**Archivo:** `src/index.css`  
**Error de Vite:**
```
@import must precede all other statements (besides @charset or empty @layer)
```
**Línea afectada:** 29  
**Solución:** Mover el `@import` al inicio del archivo CSS, antes de cualquier regla.

### 5.2 Bug: Importación dinámica vs estática

**Advertencia de Vite:**
```
/workspace/src/integrations/supabase/client.ts is dynamically imported by 
BranchLocationMap.tsx but also statically imported by 60+ otros archivos
```
**Impacto:** No hay chunk splitting efectivo para el cliente de Supabase  
**Solución:** Decidir si importar siempre estática o dinámicamente

### 5.3 Bug Potencial: Missing dependency in useEffect

```typescript
// src/components/maps/BranchLocationMap.tsx:71
useEffect(() => {
  // Código que usa latitude y longitude
}, []); // Faltan latitude y longitude
```
**Impacto:** El mapa puede no actualizarse cuando cambian las coordenadas

### 5.4 Bug Potencial: useMemo con dependencia faltante

```typescript
// src/components/cuenta/MyScheduleCard.tsx:100
useMemo(() => {
  // Código que usa 'now'
}, []); // Falta 'now' en dependencias
```

---

## 6. DEUDA TÉCNICA

### 6.1 Tipos `any` que deberían tiparse

Los 45+ usos de `any` deberían reemplazarse con tipos apropiados:

```typescript
// Ejemplo en BranchEditPanel.tsx:34
const handleSubmit = async (data: any) => { // ❌
const handleSubmit = async (data: BranchFormData) => { // ✅
```

### 6.2 Variables que deberían ser `const`

```typescript
// Ejemplo en useSalaryAdvances.ts:71
let profileMap = new Map(...); // ❌
const profileMap = new Map(...); // ✅
```

### 6.3 Chunk size warning

El bundle JS principal es de **1,607 KB** (423 KB gzipped).

**Recomendaciones:**
1. Implementar code splitting con `React.lazy()`
2. Separar rutas de admin/local en chunks diferentes
3. Lazy load componentes pesados como mapas y gráficos

---

## 7. ARCHIVOS SIN USO POTENCIAL

Según la auditoría previa en `docs/AUDIT.md`:

| Archivo | Razón |
|---------|-------|
| `src/pages/admin/UsersV2.tsx` | Reemplazado por `UsersPage.tsx` |
| `src/pages/admin/Users.tsx` | Versión legacy |
| `src/hooks/useRoleLanding.ts` | Reemplazado por `useRoleLandingV2.ts` |

---

## 8. RESUMEN DE ACCIONES PRIORITARIAS

### Alta Prioridad
1. ⚠️ Corregir `@import` en CSS (rompe compilación en algunos navegadores)
2. ⚠️ Implementar `contractType` dinámico en `useLaborHours.ts`
3. ⚠️ Corregir dependencias faltantes en useEffect/useMemo (bugs de re-render)

### Media Prioridad
4. 🔧 Tipar los 45+ usos de `any`
5. 🔧 Implementar notificación automática en `PendingScheduleRequests.tsx`
6. 🔧 Implementar cambios de certificación en `CoachingForm.tsx`
7. 🔧 Proteger console.logs restantes con `import.meta.env.DEV`

### Baja Prioridad
8. 📝 Convertir `let` a `const` donde corresponda
9. 📝 Implementar code splitting para reducir bundle size
10. 📝 Eliminar archivos no usados

---

## 9. COMANDOS PARA VERIFICAR

```bash
# Ver todos los errores de lint
npm run lint

# Build para verificar warnings de Vite
npm run build

# Buscar TODOs en el código
grep -r "TODO" src/ --include="*.ts" --include="*.tsx"

# Buscar console.logs no protegidos
grep -r "console\." src/ --include="*.ts" --include="*.tsx" | grep -v "import.meta.env.DEV"
```

---

*Documento generado automáticamente. Para mantener actualizado, re-ejecutar análisis periódicamente.*

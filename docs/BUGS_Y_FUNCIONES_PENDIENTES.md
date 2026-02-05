# Análisis de Bugs y Funciones Pendientes

**Fecha de análisis:** 5 de Febrero 2026  
**Rama:** `cursor/errores-y-funciones-pendientes-de-la-app-fb4f`

---

## Resumen Ejecutivo

Se analizó el código fuente de la aplicación buscando:
- TODOs y FIXMEs pendientes
- Funciones incompletas
- Bugs potenciales
- Patrones de código problemático
- Manejo de errores inconsistente

---

## 🔴 TODOs Pendientes (Funciones No Terminadas)

### 1. Notificación automática al responder solicitudes de horario
**Archivo:** `src/components/hr/PendingScheduleRequests.tsx` (línea 124)

```typescript
// TODO: Create automatic communication to notify the employee
```

**Descripción:** Cuando un encargado aprueba o rechaza una solicitud de día libre o justificativo, el empleado NO recibe ninguna notificación automática. Solo se actualiza el estado en la base de datos.

**Impacto:** Alto - Los empleados no saben si sus solicitudes fueron aprobadas o rechazadas hasta que revisan manualmente la app.

**Solución sugerida:** Después de actualizar el estado de la solicitud, crear una comunicación interna y/o enviar email al empleado usando el sistema de comunicaciones existente.

---

### 2. Cambios de certificación en Coaching
**Archivo:** `src/components/coaching/CoachingForm.tsx` (línea 132)

```typescript
certificationChanges: [], // TODO: Implementar cambios de certificación
```

**Descripción:** El formulario de coaching no permite actualizar las certificaciones del empleado al completar un coaching. El array `certificationChanges` siempre se envía vacío.

**Impacto:** Medio - Los encargados deben ir a la matriz de certificaciones por separado para actualizar los niveles después de un coaching.

**Solución sugerida:** Agregar un componente al formulario de coaching que permita seleccionar qué certificaciones cambiar y a qué nivel, y procesar esos cambios al guardar el coaching.

---

### 3. Tipo de contrato no dinámico
**Archivo:** `src/hooks/useLaborHours.ts` (línea 372)

```typescript
contractType: '0% BLANCO', // TODO: obtener de employee_data cuando exista
```

**Descripción:** El tipo de contrato (0% BLANCO, 60hs blanco, etc.) está hardcodeado y no se obtiene de los datos reales del empleado.

**Impacto:** Medio - Los reportes de liquidación muestran información incorrecta del tipo de contrato.

**Solución sugerida:** Agregar campo `contract_type` a la tabla `employee_data` y usarlo en el hook.

---

## 🟡 Bugs Potenciales

### 1. Console.logs en producción
**Múltiples archivos** (50+ ocurrencias)

Hay numerosos `console.log`, `console.warn` y `console.error` dispersos en el código que pueden:
- Exponer información sensible en producción
- Afectar el rendimiento

**Archivos más afectados:**
- `src/pages/ResetPassword.tsx` - 6 console.log para debug de auth
- `src/hooks/useScheduleNotifications.ts` - console.error sin condición de DEV
- `src/components/hr/InviteStaffDialog.tsx` - 4 console.error

**Solución sugerida:** Usar el wrapper `errorHandler.ts` existente o envolver los console.log con `if (import.meta.env.DEV)`.

---

### 2. Uso excesivo de `any`
**~100+ ocurrencias en archivos TypeScript**

El uso de `any` elimina los beneficios del tipado estático y puede ocultar bugs en tiempo de ejecución.

**Archivos más afectados:**
- `src/components/admin/BranchTeamTab.tsx` (19 ocurrencias)
- `src/types/shiftClosure.ts` (16 ocurrencias)
- `src/components/local/team/WarningModal.tsx` (17 ocurrencias)

**Solución sugerida:** Crear tipos/interfaces apropiados para reemplazar los `any`.

---

### 3. Dependencia faltante en useEffect (ResetPassword.tsx)
**Archivo:** `src/pages/ResetPassword.tsx` (línea 102)

```typescript
useEffect(() => {
  // ...
  if (isValidSession === null) {
    setIsValidSession(false);
  }
  // ...
}, []); // <-- Debería incluir isValidSession
```

**Descripción:** El useEffect referencia `isValidSession` pero no lo incluye en las dependencias.

**Impacto:** Bajo - Puede causar comportamiento inconsistente en casos edge de la recuperación de contraseña.

---

### 4. Manejo de errores silencioso en notificaciones
**Archivo:** `src/hooks/useScheduleNotifications.ts` (líneas 56-58, 110-112)

```typescript
try {
  await supabase.from('communications').insert({...});
} catch (e) {
  console.error('Failed to create communication:', e);
  // Error se silencia, no hay reintento ni feedback al usuario
}
```

**Descripción:** Los errores al crear comunicaciones o enviar emails se registran pero no se manejan apropiadamente.

**Impacto:** Medio - Las notificaciones pueden fallar silenciosamente sin que el encargado lo sepa.

---

### 5. Optional chaining extensivo sin validación
**Múltiples archivos**

Patrones como `?.` se usan extensivamente, pero pueden ocultar casos donde los datos nulos indican un problema real.

**Ejemplo en** `src/pages/local/AdvancesPage.tsx`:
```typescript
<SelectItem key={member.user_id} value={member.user_id!}>
```

El `!` asume que `user_id` nunca es null, pero esto puede causar errores si la data está incompleta.

---

## 🟠 Funciones Parcialmente Implementadas

### 1. Sistema de ausencias incompleto
**Archivo:** `src/hooks/useLaborHours.ts` (líneas 236-250)

El sistema busca tipos de ausencia que pueden no existir en la base de datos:
```typescript
.in('request_type', ['absence', 'sick_leave', 'justified_absence', 'unjustified_absence']);
```

El código tiene un catch que devuelve array vacío si falla, pero esto oculta que la funcionalidad de ausencias no está completamente implementada.

---

### 2. Email de notificación de horarios
**Archivo:** `src/hooks/useScheduleNotifications.ts` (líneas 62-77)

La función `send-schedule-notification` se invoca pero:
- No hay validación de que la edge function existe
- No hay retry en caso de fallo
- Los errores se silencian

---

### 3. Validación GPS permisiva
**Archivo:** `src/pages/FichajeEmpleado.tsx` (líneas 156-196)

La validación GPS siempre devuelve `true`, incluso cuando:
- El local no tiene ubicación configurada
- El usuario está fuera del radio de 200m
- No se puede obtener la ubicación

Esto parece intencional ("permite con advertencia"), pero no hay registro en la base de datos del estado GPS para auditoría posterior.

---

## 🔵 Mejoras Sugeridas

### 1. Centralizar manejo de errores
Crear un patrón consistente para manejar errores en mutations usando el `errorHandler.ts` existente:
```typescript
import { handleError } from '@/lib/errorHandler';

onError: (error) => {
  handleError(error, { context: 'nombreDeLaOperacion' });
}
```

### 2. Agregar tests unitarios
No se detectaron archivos de test (solo `vitest.config.ts` existe). Las áreas críticas que deberían tener tests:
- `useLaborHours.ts` - Cálculos de horas
- `usePermissionsV2.ts` - Lógica de permisos
- `pairClockEntries` - Emparejamiento de fichajes

### 3. Documentar funciones pendientes
Agregar comentarios `@todo` con prioridad y responsable:
```typescript
/**
 * @todo HIGH Implementar notificación automática al empleado
 * @see https://github.com/org/repo/issues/XXX
 */
```

---

## 📋 Acciones Recomendadas

| Prioridad | Tarea | Esfuerzo |
|-----------|-------|----------|
| 🔴 Alta | Implementar notificación al responder solicitudes | 2-4 horas |
| 🔴 Alta | Limpiar console.logs en producción | 1-2 horas |
| 🟡 Media | Implementar cambios de certificación en coaching | 4-6 horas |
| 🟡 Media | Agregar tipo de contrato dinámico | 1-2 horas |
| 🟡 Media | Reducir uso de `any` | 4-8 horas |
| 🔵 Baja | Agregar tests unitarios | 8+ horas |
| 🔵 Baja | Registrar estado GPS en fichajes | 2-4 horas |

---

## Conclusión

La aplicación está bien estructurada y es funcional, pero tiene 3 TODOs pendientes importantes y varios patrones de código que podrían causar problemas en producción. La prioridad más alta es implementar las notificaciones a empleados cuando se responden sus solicitudes, ya que esto afecta directamente la experiencia del usuario.

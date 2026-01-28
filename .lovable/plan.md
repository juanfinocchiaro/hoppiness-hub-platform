
# Plan Maestro: Simplificación y Optimización del Sistema Hoppiness

## Resumen Ejecutivo

Este plan reorganiza el sistema completo enfocándose en 6 funcionalidades core: **Horarios, Fichaje, Carga de Ventas, Comunicaciones, Vista Franquicia y Gestión de Usuarios**. Se eliminará código legacy, se unificarán tablas redundantes y se optimizará para uso mobile-first.

---

## Fase 1: Limpieza de Base de Datos

### 1.1 Eliminar tabla `employees` (legacy)
- Migrar cualquier campo útil a `profiles` o `employee_data`
- Actualizar referencias en código

### 1.2 Migrar `employee_schedules` a `user_id`
- Renombrar columna `employee_id` → `user_id`
- Actualizar todos los queries relacionados

### 1.3 Migrar `salary_advances` a `user_id`
- Renombrar columna `employee_id` → `user_id`
- Actualizar componentes: `AdvancesPage.tsx`, `useSalaryAdvances.ts`

### 1.4 Unificar datos personales en `profiles`
- Asegurar que DNI, CBU, dirección, teléfono de emergencia estén en `profiles`
- `employee_data` solo mantiene: `hire_date`, `monthly_hours_target`

---

## Fase 2: Sistema de Turnos (4 turnos)

### 2.1 Estructura de turnos
```
Turno Mañana    → Configurable por local
Turno Mediodía  → Default activo
Turno Noche     → Default activo  
Turno Trasnoche → Configurable por local
```

### 2.2 Configuración en Mi Local
- Nueva sección en Config: "Turnos habilitados"
- Checkboxes para habilitar/deshabilitar cada turno
- Horarios personalizables por turno

### 2.3 Visibilidad en Mi Marca
- Dashboard muestra qué locales tienen turnos extra habilitados
- Consolidado de ventas respeta los turnos activos de cada local

---

## Fase 3: Sistema de Fichaje Renovado

### 3.1 Flujo del QR Estático
```
┌─────────────────────────────────────────────────────────┐
│  ENCARGADO                     EMPLEADO                 │
│  ─────────                     ────────                 │
│  1. Abre /fichaje-qr/:branch   1. Escanea QR con celu   │
│  2. Pantalla muestra QR fijo   2. Abre web del fichaje  │
│     (código único del local)   3. Elige ENTRADA/SALIDA  │
│                                4. Sistema pide:         │
│                                   - Selfie (cámara)     │
│                                   - Ubicación (GPS)     │
│                                5. Valida y registra     │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Validaciones
- **Ubicación**: Radio 200m desde coordenadas del local
- **Si GPS falla**: Permite fichar con advertencia visual + registro en BD
- **Selfie**: Solo validación en momento, NO se almacena
- **Cámara**: Bloquear acceso a galería (solo captura en vivo)

### 3.3 Bloqueo por Reglamento
- Si hay reglamento nuevo sin firmar:
  - Días 1-5: Mostrar alerta "Tenés X días para firmar el nuevo reglamento"
  - Día 6+: Bloquear fichaje con mensaje "Contactá a tu encargado"

---

## Fase 4: Sistema de Reglamentos

### 4.1 Flujo completo
```
┌────────────────────────────────────────────────────────────┐
│  1. MARCA sube PDF del reglamento (Mi Marca > Config)      │
│  2. Sistema notifica a ENCARGADOS                          │
│  3. ENCARGADO imprime y hace firmar físicamente            │
│  4. ENCARGADO sube FOTO del papel firmado al perfil        │
│  5. EMPLEADO puede ver/descargar desde Mi Cuenta           │
│  6. Sistema guarda historial de versiones anteriores       │
└────────────────────────────────────────────────────────────┘
```

### 4.2 Nueva tabla `regulation_signatures`
```sql
- id, user_id, regulation_version, signed_document_url
- signed_at, uploaded_by (encargado), branch_id
```

### 4.3 Alertas al Encargado
- Banner en dashboard: "X empleados pendientes de firmar reglamento"
- Lista con nombres y días restantes

---

## Fase 5: Sistema de Comunicaciones

### 5.1 Tipos de comunicados
- Tags predefinidos: `actualizacion_menu`, `promocion`, `reglamento`, `general`, `operativo`
- Campo adicional para etiqueta personalizada (texto libre)

### 5.2 Segmentación de destinatarios
- Marca puede enviar a: Todos, Solo Franquiciados, Solo Encargados
- Encargado envía a: Su equipo completo

### 5.3 Vista en Mi Cuenta (Empleado)
```
┌─────────────────────────────────────┐
│  COMUNICADOS                        │
│  ───────────                        │
│  📢 De la Marca (3 sin leer)        │
│  ├─ Nuevo menú de verano            │
│  └─ Promoción 2x1 sábados           │
│                                     │
│  📣 De tu Encargado (1 sin leer)    │
│  └─ Reunión de equipo viernes       │
└─────────────────────────────────────┘
```

### 5.4 Notificaciones
- Nuevo comunicado → Banner in-app (no email)

---

## Fase 6: Sistema de Apercibimientos

### 6.1 Flujo
```
1. ENCARGADO crea apercibimiento en Mi Local > Equipo
2. Imprime y hace firmar físicamente
3. Sube foto del documento firmado
4. EMPLEADO ve en Mi Cuenta y puede descargar
5. FRANQUICIADO ve todos los del local en Mi Local > Apercibimientos
```

### 6.2 Vista del Encargado
- Dashboard muestra ambos:
  - "Apercibimientos que emití" (a su equipo)
  - "Apercibimientos que recibí" (del Franquiciado)

### 6.3 Campo `signed_document_url` en `warnings`

---

## Fase 7: Sistema de Adelantos

### 7.1 Flujo simplificado
```
1. Administración paga adelanto (fuera del sistema)
2. ENCARGADO registra en sistema (post-pago)
3. EMPLEADO ve historial en Mi Cuenta
4. FRANQUICIADO ve todos los adelantos en Mi Local > Adelantos
```

### 7.2 Auto-aprobación
- Encargado puede auto-aprobarse adelantos
- Quedan registrados para auditoría del Franquiciado

---

## Fase 8: Dashboard del Encargado

### 8.1 Vista principal (mobile-first)
```
┌─────────────────────────────────────┐
│  📊 VENTAS HOY          $125.400    │
│  ├─ Mediodía: $45.200 (Juan)        │
│  └─ Noche: $80.200 (María)          │
│                                     │
│  👥 EQUIPO AHORA                    │
│  ├─ 🟢 Juan (desde 11:30)           │
│  ├─ 🟢 María (desde 19:00)          │
│  └─ ⚪ Pedro (no fichó)             │
│                                     │
│  📬 PENDIENTES                      │
│  ├─ 2 solicitudes de día libre      │
│  ├─ 3 empleados sin leer comunicado │
│  └─ 1 firma de reglamento pendiente │
└─────────────────────────────────────┘
```

---

## Fase 9: Corrección de Bugs Críticos

### 9.1 `AceptarInvitacion.tsx`
- Cambiar escritura de `user_roles` → `user_roles_v2`
- Incluir `branch_ids[]` correctamente

### 9.2 `InviteStaffDialog.tsx`
- Actualizar roles a: `colaborador`, `cajero`, `encargado`
- Eliminar referencia a `kds`

### 9.3 `MyScheduleCard.tsx`
- Cambiar query de `employee_id` → `user_id`

### 9.4 `CuentaPerfil.tsx`
- Agregar campos: DNI, CBU, Alias, Dirección, Fecha nacimiento
- Campos editables por el empleado

---

## Fase 10: Optimización Mobile

### 10.1 Principios de diseño
- Tarjetas colapsables en Mi Cuenta
- Listas tipo cards en lugar de tablas anchas
- Bottom navigation para acciones frecuentes
- Touch targets mínimo 44px

### 10.2 Pantallas prioritarias (orden de importancia)
1. **Fichaje** - Escanear QR, selfie, ubicación
2. **Mi Cuenta** - Horarios, comunicados, documentos
3. **Cargar Ventas** - Para cajeros (acceso rápido)
4. **Ver Equipo** - Para encargados
5. **Dashboard Local** - Resumen general

### 10.3 Acceso completo mobile
- Cajeros y Colaboradores acceden a TODA la app desde celular
- No hay restricción de "solo Mi Cuenta"

---

## Fase 11: Notificaciones Email (Resend)

### 11.1 Eventos que disparan email INMEDIATO
- Cambio de horario asignado

### 11.2 Eventos solo in-app (banner/badge)
- Nuevo comunicado
- Nuevo apercibimiento
- Adelanto registrado

---

## Archivos a Modificar

### Componentes principales
```
src/pages/local/TeamPage.tsx
src/pages/local/SchedulesPage.tsx
src/pages/local/AdvancesPage.tsx
src/pages/local/WarningsPage.tsx
src/pages/cuenta/CuentaDashboard.tsx
src/pages/cuenta/CuentaPerfil.tsx
src/components/hr/InviteStaffDialog.tsx
src/pages/AceptarInvitacion.tsx
src/components/cuenta/MyScheduleCard.tsx
src/components/local/SalesEntryModal.tsx
```

### Nuevos archivos a crear
```
src/pages/local/AttendanceQR.tsx (QR estático para encargado)
src/pages/FichajeEmpleado.tsx (flujo completo empleado)
src/components/cuenta/MyRegulationsCard.tsx
src/components/local/RegulationSignatures.tsx
src/components/local/EncargadoDashboard.tsx
```

### Edge Functions
```
supabase/functions/send-schedule-change-email/index.ts
```

---

## Migraciones SQL Requeridas

1. **Migrar `employee_schedules`**: Renombrar `employee_id` → `user_id`
2. **Migrar `salary_advances`**: Renombrar `employee_id` → `user_id`
3. **Crear `regulation_signatures`**: Nueva tabla
4. **Agregar campo `signed_document_url`** a `warnings`
5. **Agregar campo `custom_label`** a `communications`
6. **Agregar configuración de turnos** a `branches`
7. **Eliminar tabla `employees`**

---

## Orden de Implementación

| Prioridad | Fase | Descripción | Estado |
|-----------|------|-------------|--------|
| 1 | Fase 1 | Limpieza BD | ✅ COMPLETADO |
| 2 | Fase 9 | Bugs críticos | ✅ COMPLETADO |
| 3 | Fase 3 | Fichaje renovado | ✅ COMPLETADO |
| 4 | Fase 4 | Reglamentos | ✅ COMPLETADO |
| 5 | Fase 5 | Comunicaciones | ✅ COMPLETADO |
| 6 | Fase 6 | Apercibimientos | ✅ COMPLETADO |
| 7 | Fase 7 | Adelantos | ✅ COMPLETADO |
| 8 | Fase 2 | Sistema turnos | ✅ COMPLETADO |
| 9 | Fase 8 | Dashboard Encargado | ✅ COMPLETADO |
| 10 | Fase 10 | Mobile | ✅ COMPLETADO |
| 11 | Fase 11 | Emails | 🔄 PENDIENTE |

---

## Resultado Final

Un sistema limpio, sin código legacy, optimizado para celular, donde:
- **Colaborador/Cajero**: Ficha, ve horarios, comunicados y sus documentos
- **Cajero**: Además carga ventas por turno
- **Encargado**: Gestiona equipo, horarios, comunicados locales, ve todo de un vistazo
- **Franquiciado**: Supervisa múltiples locales, ve adelantos y apercibimientos completos

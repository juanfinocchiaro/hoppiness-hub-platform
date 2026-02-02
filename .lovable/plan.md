

# Plan Definitivo: Correcciones Estructurales + Sistema de Documentos Imprimibles

## Resumen Ejecutivo

Este plan consolida todas las correcciones pendientes en una implementación cohesiva:

| # | Problema | Solución |
|---|----------|----------|
| 1 | Campo "Valor hora" no usado | Eliminar de UI (3 archivos) |
| 2 | Franquiciados con fichajes/horarios/apercibimientos | Excluirlos de esos sistemas |
| 3 | Apercibimiento sin nombre + logo negro | Corregir queries a `.eq('id', ...)` + cambiar logo |
| 4 | No exporta PDF | Agregar botón "Descargar PDF" |
| 5 | No sube foto de documento firmado | Agregar flujo de upload post-creación |
| 6 | Proceso de firma de reglamento confuso | Rediseñar igual que apercibimiento |

---

## Corrección 1: Eliminar "Valor Hora"

El campo `hourly_rate` existe en la base de datos pero no se usa. Lo quitamos de la UI.

### Archivos a Modificar

**`src/components/local/team/EmployeeDataModal.tsx`**
- Eliminar estado `hourlyRate` y `setHourlyRate` (líneas 39, 77)
- Eliminar el input de "Valor hora ($)" del tab "Laboral" (líneas 244-253)
- Eliminar `hourly_rate` del objeto de guardado (línea 110)

**`src/components/local/team/types.ts`**
- Eliminar `hourly_rate: number | null` del tipo `EmployeeData` (línea 34)

---

## Corrección 2: Excluir Franquiciados de RRHH

### Contexto de Negocio

Un **franquiciado** es el dueño del local, no un empleado. No corresponde que tenga:
- Fichajes de entrada/salida (no trabaja turnos operativos)
- Horarios asignados (nadie le asigna horarios)
- Apercibimientos (no se le puede amonestar)
- Adelantos de sueldo (no tiene sueldo del local)

### Archivos a Modificar

**`src/components/local/team/TeamTable.tsx`**
- Separar el listado: franquiciados en header/sección especial, empleados en tabla principal
- Agregar filtro: `team.filter(m => m.local_role !== 'franquiciado')`

**`src/components/local/team/EmployeeExpandedRow.tsx`**
- Agregar condición para ocultar acciones RRHH si `member.local_role === 'franquiciado'`:
  - Ocultar: "Ver fichajes", "Ver horarios", "Ver liquidación", "Nuevo apercibimiento"
  - Mantener: "Editar datos", "Desactivar"

**`src/components/local/RegulationSignaturesPanel.tsx`**
- Excluir franquiciados del sistema de firmas (agregar filtro en línea 52):
  ```typescript
  .not('local_role', 'eq', 'franquiciado')
  ```

---

## Corrección 3: Bug del Nombre + Logo Negro

### Causa del Bug
Los archivos aún usan `.eq('user_id', userId)` pero el campo `user_id` ya no existe en `profiles` después de la migración. Debe ser `.eq('id', userId)`.

### Archivos a Corregir

**`src/components/local/team/WarningModal.tsx`**
- Línea 52: `.eq('user_id', userId)` → `.eq('id', userId)`
- Línea 100: `.eq('user_id', user.id)` → `.eq('id', user.id)`

**`src/components/local/team/EmployeeDataModal.tsx`**
- Línea 52: `.eq('user_id', userId)` → `.eq('id', userId)`
- Línea 132: `.eq('user_id', userId)` → `.eq('id', userId)`

### Logo con Fondo Negro

**`src/components/local/team/WarningDocumentPreview.tsx`**
- Cambiar import del logo:
  ```typescript
  // Antes
  import logoHoppiness from '@/assets/logo-hoppiness.png';
  // Después
  import logoHoppiness from '@/assets/logo-hoppiness-blue.png';
  ```

---

## Corrección 4: Exportar a PDF

### Implementación

No hay librerías de PDF instaladas. La solución más simple y efectiva es usar la API nativa de impresión del navegador con opción "Guardar como PDF".

**`src/components/local/team/WarningModal.tsx`**
- Cambiar el texto del botón de "Imprimir" a "Descargar / Imprimir"
- La función `handlePrint()` ya abre ventana de impresión donde el usuario puede elegir "Guardar como PDF"
- Agregar tooltip explicativo: "Podés elegir 'Guardar como PDF' en el diálogo de impresión"

### Alternativa Futura (Opcional)
Si se requiere generación directa de PDF sin diálogo de impresión, se puede instalar `jspdf` + `html2canvas` en el futuro.

---

## Corrección 5: Upload de Documento Firmado (Apercibimiento)

### Flujo Actual
1. Encargado crea apercibimiento → Guarda en DB
2. Desde WarningsPage puede subir foto firmada

### Flujo Mejorado
1. Encargado crea apercibimiento
2. Ve vista previa
3. Botones: **"Descargar/Imprimir"** + **"Guardar y subir firma después"**
4. Después de guardar, el sistema muestra: **"¿Subir documento firmado ahora?"**
5. Puede subir foto inmediatamente o desde WarningsPage después

### Archivos a Modificar

**`src/components/local/team/WarningModal.tsx`**
- Agregar estado `savedWarningId` para tracking
- Después de guardar exitosamente, mostrar diálogo de upload
- Reutilizar lógica de upload de `WarningsPage.tsx`

---

## Corrección 6: Sistema de Firma de Reglamento Rediseñado

### Problema Actual
El proceso es confuso:
1. Superadmin sube PDF del reglamento (OK)
2. Encargado imprime TODO el reglamento (??)
3. Empleado firma físicamente (¿dónde?)
4. Encargado saca foto de... ¿qué página?
5. Sube la foto al sistema

### Nuevo Proceso (Igual que Apercibimiento)
1. Superadmin sube PDF del reglamento (sin cambios)
2. Encargado va a "Firmas de Reglamento" en Mi Local
3. Por cada empleado pendiente puede:
   - **Ver PDF del reglamento** (para mostrarlo/entregarlo al empleado)
   - **Generar hoja de firma** (documento membretado personalizado)
   - Imprimir la hoja de firma
   - Hacer firmar físicamente
   - **Subir foto de la hoja firmada**

### Nuevo Componente: RegulationSignatureSheet.tsx

Documento formal similar al apercibimiento con:

```
┌─────────────────────────────────────────────────────────────┐
│                                        [LOGO HOPPINESS]    │
│                                                             │
│     CONSTANCIA DE RECEPCIÓN Y FIRMA DEL REGLAMENTO         │
│                      INTERNO                                │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  DATOS DEL EMPLEADO                                         │
│  ─────────────────────                                      │
│  Nombre: ___________________                                │
│  DNI: ______________________                                │
│  Puesto: ___________________                                │
│  Sucursal: _________________                                │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Por la presente dejo constancia de haber recibido,        │
│  leído y comprendido el Reglamento Interno de              │
│  Hoppiness Club (Versión X, publicado el DD/MM/AAAA),      │
│  comprometiéndome a cumplir con todas las disposiciones    │
│  allí establecidas.                                         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │                 │    │                 │                │
│  │  Firma Empleado │    │  Firma Encargado│                │
│  │                 │    │     (testigo)   │                │
│  └─────────────────┘    └─────────────────┘                │
│  Aclaración: _________   Aclaración: _________              │
│                                                             │
│  Fecha de firma: ____/____/________                        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  © 2026 Hoppiness Club - Documento interno                 │
│  Ref: REG-V{version}-{user_id_short}                       │
└─────────────────────────────────────────────────────────────┘
```

### Archivos a Crear

**`src/components/local/RegulationSignatureSheet.tsx`**
- Componente que genera el documento de firma
- Props: `employeeName`, `employeeDni`, `employeeRole`, `branchName`, `regulationVersion`, `publishedAt`
- Mismo estilo que WarningDocumentPreview

### Archivos a Modificar

**`src/components/local/RegulationSignaturesPanel.tsx`**
- Agregar botón "Generar hoja de firma" por cada empleado pendiente
- Agregar modal con vista previa del documento
- Agregar botón "Descargar/Imprimir"
- Mantener flujo existente de "Subir foto firmada"

---

## Resumen de Archivos

| Archivo | Tipo | Cambios |
|---------|------|---------|
| `EmployeeDataModal.tsx` | Modificar | Eliminar valor hora + corregir `.eq('id', ...)` |
| `types.ts` | Modificar | Eliminar `hourly_rate` del tipo |
| `TeamTable.tsx` | Modificar | Separar franquiciados de empleados |
| `EmployeeExpandedRow.tsx` | Modificar | Ocultar acciones RRHH para franquiciados |
| `WarningModal.tsx` | Modificar | Corregir query + agregar upload post-guardado |
| `WarningDocumentPreview.tsx` | Modificar | Cambiar logo a versión azul |
| `RegulationSignaturesPanel.tsx` | Modificar | Excluir franquiciados + generar hoja de firma |
| `RegulationSignatureSheet.tsx` | **CREAR** | Documento de constancia de firma |

---

## Flujo Visual Final

### Apercibimiento
```
Encargado selecciona empleado
         ↓
Completa formulario (tipo, fecha, descripción)
         ↓
    Vista previa del documento
         ↓
   ┌─────────────────────────────┐
   │  [Volver]  [Imprimir/PDF]  [Guardar]
   └─────────────────────────────┘
         ↓ (al guardar)
   "¿Subir foto del documento firmado?"
         ↓
   [Ahora] o [Después desde Apercibimientos]
```

### Reglamento
```
Encargado ve lista de empleados pendientes
         ↓
Por cada empleado:
   [Ver PDF reglamento] [Generar hoja firma]
         ↓ (generar hoja)
   Vista previa del documento de constancia
         ↓
   [Imprimir/PDF] → Imprime → Hace firmar
         ↓
   [Subir foto firmada] → Sube imagen
         ↓
   Sistema registra firma ✓
```

---

## Sección Técnica

### Dependencias
No se requieren nuevas dependencias. Se usa la API nativa de impresión del navegador.

### Storage Buckets
Ya existen:
- `regulation-signatures` - Para fotos de reglamento firmado
- `warning-signatures` - Para fotos de apercibimiento firmado (crear si no existe)

### Orden de Implementación
1. Corregir queries `.eq('id', ...)` (crítico - nombres "Sin nombre")
2. Cambiar logo a versión azul
3. Eliminar "Valor hora"
4. Excluir franquiciados de RRHH
5. Mejorar flujo de upload en WarningModal
6. Crear RegulationSignatureSheet y actualizar panel


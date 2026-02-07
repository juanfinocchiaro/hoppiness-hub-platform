

# Plan: Sistema de Visitas de Supervisión (Coordinadores)

## Resumen

Crear un módulo completo para que el **Coordinador de marca** pueda realizar visitas de supervisión **sorpresa** a sucursales (BOH - Back of House y FOH - Front of House), registrar hallazgos con fotos, generar informes automáticos y notificar a encargados/franquiciados.

---

## Cambios respecto al plan anterior

1. **Sin programación**: Las visitas son sorpresa, no se agendan
   - Se elimina el campo `scheduled_at`
   - Se elimina el estado `'programada'`
   - Se elimina la sección "Programadas" del sidebar
   
2. **Encargados ven todo**: El encargado ve TODAS las visitas de su local, no solo donde estuvo presente

---

## Entidades del Sistema

### Nueva Tabla: `branch_inspections`

```sql
branch_inspections
├── id (UUID)
├── branch_id (FK branches)
├── inspection_type (TEXT) → 'boh' | 'foh'
├── inspector_id (FK auth.users) → El coordinador que hace la visita
├── started_at (TIMESTAMPTZ) → Cuándo empezó
├── completed_at (TIMESTAMPTZ) → Cuándo terminó
├── status (TEXT) → 'en_curso' | 'completada' | 'cancelada'
├── score_total (INT) → Puntaje total 0-100
├── present_manager_id (FK auth.users) → El encargado presente durante la visita
├── general_notes (TEXT) → Observaciones generales
├── critical_findings (TEXT) → Hallazgos críticos (resumen)
├── action_items (JSONB) → Acciones y responsables
├── created_at / updated_at
```

### Nueva Tabla: `inspection_items`

```sql
inspection_items
├── id (UUID)
├── inspection_id (FK branch_inspections)
├── category (TEXT)
├── item_key (TEXT)
├── item_label (TEXT)
├── complies (BOOLEAN | NULL)
├── observations (TEXT)
├── photo_url (TEXT)
├── sort_order (INT)
```

### Nueva Tabla: `inspection_templates`

```sql
inspection_templates
├── id (UUID)
├── inspection_type (TEXT) → 'boh' | 'foh'
├── category (TEXT)
├── item_key (TEXT)
├── item_label (TEXT)
├── sort_order (INT)
├── is_active (BOOLEAN)
```

---

## Checklist de Items

### BOH (Back-of-House) - 17 ítems

| Categoría | Item |
|-----------|------|
| **Heladeras** | Temperatura heladeras (superior e inferior) |
| | Etiquetado FIFO legible y resistente al frío |
| | Juntas y burletes sin fugas ni condensación |
| | Ventiladores y rejillas limpios |
| | Stock próximo a vencer identificado |
| **Depósito** | Orden en depósito (carnes, salsas, descartables) |
| | Iluminación y cableado en depósito |
| **Cocina** | Limpieza de campanas y paredes de cocina |
| | Nivel de aceite en freidoras (3/4 cesta) |
| | Fecha de cambio de aceite actualizada |
| | Superficie de planchas en buen estado |
| | Rejillas de desagüe completas |
| | Calidad de corte de vegetales |
| **Seguridad** | Certificado de desinfección visible |
| | Matafuegos cargado y accesible |
| | Pisos sin grietas peligrosas |
| | Ausencia de celulares en área operativa |

### FOH (Front-of-House) - 13 ítems

| Categoría | Item |
|-----------|------|
| **Mostrador** | Limpieza de mostrador y terminales de pago |
| | Cartelería actualizada y libre de polvo |
| | Uniformes del personal limpios y conformes |
| **Producto** | Tiempo pedido-entrega (< 6 min) |
| | Presentación del producto |
| | Punto de cocción de la carne |
| **Salón** | Limpieza de mesas y sillas |
| | Estado de iluminación en salón y barra |
| | Baños: inodoros y lavamanos funcionando |
| | Suministro de papel y jabón en baños |
| | Señalética interna legible y sin daños |
| **Atención** | Saludo y atención |
| | Claridad de respuestas a preguntas de clientes |

---

## Flujo de la Visita (Sorpresa)

```text
1. INICIAR VISITA
   ├── Coordinador llega al local
   ├── Elige tipo: BOH o FOH
   ├── Selecciona encargado presente
   └── Estado: "en_curso"

2. EJECUTAR CHECKLIST
   ├── Para cada ítem: Cumple / No cumple / N/A
   ├── Observaciones opcionales
   └── Subir foto si hay hallazgo

3. CERRAR VISITA
   ├── Agregar observaciones generales
   ├── Marcar hallazgos críticos
   ├── Definir acciones con responsable y plazo
   └── Se calcula puntaje automático

4. NOTIFICAR
   └── Automático a encargado + franquiciado
```

---

## Navegación

### En BrandSidebar - Nueva sección

```text
📋 Supervisión
├── Nueva Visita (+)
└── Historial
```

### Rutas

```text
/mimarca/supervisiones          → Historial de visitas
/mimarca/supervisiones/nueva    → Iniciar nueva visita
/mimarca/supervisiones/:id      → Ejecutar/ver visita
```

---

## Permisos (Actualizado)

| Rol | Puede |
|-----|-------|
| `superadmin` | Todo |
| `coordinador` | Crear/ejecutar visitas, ver todas |
| `franquiciado` | Ver visitas de su local |
| `encargado` | **Ver TODAS las visitas de su local** |

---

## Archivos a Crear

| Archivo | Descripción |
|---------|-------------|
| `src/types/inspection.ts` | Tipos TypeScript |
| `src/hooks/useInspections.ts` | CRUD de visitas |
| `src/pages/admin/InspectionsPage.tsx` | Historial con filtros |
| `src/pages/admin/NewInspectionPage.tsx` | Iniciar visita |
| `src/pages/admin/InspectionDetailPage.tsx` | Ejecutar/ver visita |
| `src/components/inspections/InspectionChecklist.tsx` | Formulario checklist |
| `src/components/inspections/InspectionItemRow.tsx` | Fila individual |
| `src/components/inspections/InspectionSummary.tsx` | Resumen y puntaje |
| `src/components/inspections/InspectionPhotoUpload.tsx` | Upload de fotos |
| `src/components/inspections/InspectionActionItems.tsx` | Acciones a tomar |
| `src/components/cuenta/MyInspectionsCard.tsx` | Card para Mi Cuenta |

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `App.tsx` | Agregar rutas de supervisiones |
| `BrandSidebar.tsx` | Nueva sección "Supervisión" |
| `CuentaDashboard.tsx` | Agregar MyInspectionsCard |

---

## Migración de Base de Datos

1. Crear tabla `inspection_templates` con 30 ítems predefinidos (BOH + FOH)
2. Crear tabla `branch_inspections`
3. Crear tabla `inspection_items`
4. Crear bucket de storage `inspection-photos`
5. RLS policies:
   - Coordinadores/Superadmins: acceso total
   - Franquiciados: ver visitas de sus locales
   - **Encargados: ver visitas de su local (sin restricción de presencia)**

---

## Edge Function: Notificación

`send-inspection-notification`:
- Se dispara al completar visita
- Email al encargado presente + franquiciado del local
- Incluye: puntaje, hallazgos críticos, acciones pendientes

---

## UI del Checklist

```text
┌─────────────────────────────────────────────────────────────┐
│  🏪 Villa Carlos Paz · FOH · 07/02/26 20:30                │
│  Coordinador: Ismael Sanchez Fundaro                       │
│  Encargado presente: [Select...]                           │
├─────────────────────────────────────────────────────────────┤
│  MOSTRADOR                                          3/3 ✓  │
│  ├─ Limpieza mostrador y terminales    [✓] [✗] [N/A] 📷   │
│  ├─ Cartelería actualizada             [✓] [✗] [N/A] 📷   │
│  └─ Uniformes del personal             [✓] [✗] [N/A] 📷   │
│                                                             │
│  PRODUCTO                                           2/3 ⚠  │
│  ├─ Tiempo pedido-entrega (< 6 min)    [✓] [✗] [N/A] 📷   │
│  │    └─ Obs: "8 minutos"                                  │
│  ├─ Presentación del producto          [✓] [✗] [N/A] 📷   │
│  └─ Punto de cocción de la carne       [✓] [✗] [N/A] 📷   │
├─────────────────────────────────────────────────────────────┤
│  PUNTAJE: 85/100                                           │
│  [Guardar Borrador]           [Cerrar y Notificar]        │
└─────────────────────────────────────────────────────────────┘
```

---

## Vista en Mi Cuenta (Encargados)

```text
📋 Supervisiones de mi Local
──────────────────────────────
Última visita: 07/02/26 - FOH - 85/100 ✓
Ver informe completo →

Acciones pendientes:
• Reparar luz led de barra (vence 14/02)
```

---

## Beneficios

1. **Visitas sorpresa**: Sin aviso previo, refleja el estado real
2. **Trazabilidad**: El encargado ve todo el historial de su local
3. **Evidencia**: Fotos adjuntas a cada hallazgo
4. **Accionable**: Acciones con responsable y fecha límite
5. **Automático**: Notificación inmediata al cerrar




# Rediseno completo de las pantallas de Delivery

## Situacion actual

Hay 3 pantallas + 1 componente relacionados con delivery, todos con diseno inconsistente, UX confusa y redundancias:

1. **Mi Marca > Delivery** (`DeliveryConfigPage.tsx`) - Config global de pricing + lista de locales
2. **Mi Marca > Delivery > [branch]** (`BranchDeliveryDetailPage.tsx`) - Detalle de un local con radio, barrios, mapa inline
3. **Mi Local > Config > Delivery** (`LocalDeliveryZonesPage.tsx`) - Vista readonly para encargados
4. **DeliveryZonesManager** (`DeliveryZonesManager.tsx`) - Componente de zonas manuales (no se usa activamente)

## Problemas detectados

1. **Detalle de barrio expandido es excesivo**: Al expandir un barrio se muestra ciudad, distancia, estado, decidido por, un mapa OpenStreetMap grande... para algo que es simplemente "habilitado/bloqueado". El mapa por barrio individual no aporta valor.
2. **Lista de barrios poco escaneable**: Los 42 barrios se muestran en una lista vertical con accordion, cuando deberian ser una tabla compacta o lista densa con acciones inline.
3. **Badges de estado inconsistentes**: Dice "Asignado" en verde pero el status en la DB es "enabled". La terminologia es confusa.
4. **Bloqueo de barrio**: Requiere expandir el barrio, click "Bloquear", elegir motivo, confirmar. Demasiados pasos para una accion simple.
5. **DeliveryZonesManager**: Componente huerfano de zonas manuales que no se integra con el sistema de barrios/radio. Potencial redundancia.
6. **LocalDeliveryZonesPage**: Muestra la formula vigente y los barrios como lista plana. Funcional pero visualmente pobre y sin busqueda.
7. **Pricing form**: Funcional pero podria agrupar mejor los campos logicamente.

## Plan de cambios

### 1. `BranchDeliveryDetailPage.tsx` - Rediseno mayor

**Antes**: Lista de barrios con accordion individual, mapa por barrio, detalle expandido verboso.

**Despues**:
- **Card "Configuracion"**: Toggle delivery + slider de radio (se mantiene, esta bien).
- **Card "Barrios"**: Redisenar completamente:
  - Header con contadores (habilitados/bloqueados) + boton Regenerar + buscador de texto inline
  - Tabla compacta (no accordion) con columnas: icono estado, nombre barrio, distancia, accion
  - La accion es un boton pequeno "Bloquear" o "Habilitar" directo, sin expandir
  - Para bloquear: un popover pequeno con select de motivo + confirmar, en vez del accordion actual
  - Cambiar badge "Asignado" por "Habilitado" (consistente con DB)
  - Eliminar el mapa por barrio individual (no aporta)
  - Agregar Tabs "Habilitados | Bloqueados" para separar visualmente
  - Scroll interno con max-height para no hacer scroll de pagina

### 2. `DeliveryConfigPage.tsx` - Mejoras menores

**Cambios**:
- Agrupar los 6 campos del pricing form en 2 secciones visuales: "Costos" (distancia base, costo base, costo excedente) y "Operacion" (radio max, velocidad, tiempo prep)
- Mover el ejemplo de calculo a un badge/callout mas sutil
- Lista de locales: Agregar indicador visual de barrios asignados (ej: "42 barrios") y un dot de estado mas prominente (verde/gris)

### 3. `LocalDeliveryZonesPage.tsx` - Mejoras de UX

**Cambios**:
- Cards de formula vigente: Mantener pero con mejor contraste y tipografia
- Lista de barrios: Agregar buscador de texto para filtrar rapidamente
- Mostrar barrios bloqueados inline con badge rojo en vez de card separada
- Una sola lista unificada con filtro "Todos | Habilitados | Bloqueados"

### 4. `DeliveryZonesManager.tsx` - Sin cambios

Este componente se usa para zonas manuales de la WebApp (diferente al sistema de barrios por radio). Se deja como esta ya que cumple una funcion distinta.

---

## Detalle tecnico

### Archivos a modificar

| Archivo | Tipo de cambio |
|---|---|
| `src/pages/admin/BranchDeliveryDetailPage.tsx` | Rediseno completo de la seccion de barrios |
| `src/pages/admin/DeliveryConfigPage.tsx` | Reorganizar form + mejorar lista de locales |
| `src/pages/local/LocalDeliveryZonesPage.tsx` | Agregar buscador, unificar listas, mejorar visual |

### Patrones a seguir

- Usar `Popover` de Radix para el bloqueo de barrios (en vez de accordion)
- Usar `Tabs` para filtrar habilitados/bloqueados
- Input de busqueda con icono Search para filtrar barrios por nombre
- Mantener la paleta premium existente (tokens semanticos, bordes redondeados, transiciones 150ms)
- No se agregan dependencias nuevas

### Estimacion

~3 archivos, cambios principalmente de layout y UX. Sin cambios en hooks ni en base de datos.


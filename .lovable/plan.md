

## Mejora: Mostrar toda la informacion en los mensajes de contacto

### Problema

La pagina de mensajes de contacto (`/mimarca/mensajes`) no muestra varios campos que los usuarios completan en los formularios. Los datos estan en la base de datos pero el componente no los renderiza.

### Campos faltantes por tipo

**Franquicias:**
- `message` - Texto libre con motivacion/experiencia del postulante (ej: "soy del interior de Cordoba, tuve una franquicia...")
- `investment_range` - Rango de inversion (campo adicional)
- `phone` - Telefono visible como texto (no solo en boton WhatsApp)

**Empleo:**
- `employment_branch_id` - Sucursal a la que postularon (resolver nombre desde branches)
- `phone` - Telefono visible como texto

**Todos los tipos:**
- El telefono deberia mostrarse como dato de contacto en la card, no solo dentro del boton WhatsApp

### Cambios

**1. `src/hooks/useContactMessages.ts`**
- Agregar `investment_range` y `employment_branch_id` al tipo `ContactMessage`

**2. `src/pages/admin/ContactMessagesPage.tsx`**
- Mostrar `phone` como dato debajo del email en todas las cards
- **Franquicias**: Agregar el `message` como parrafo debajo de los datos de zona/capital. Mostrar `investment_range` si existe
- **Empleo**: Hacer join o query para mostrar el nombre de la sucursal a la que postularon
- **Default/otros tipos**: Ya muestra `message`, esta bien

### Detalle tecnico

El cambio principal es en el componente `MessageCard` dentro de `ContactMessagesPage.tsx`:

- En el header, agregar el telefono como linea de texto junto al email
- En `renderSpecificFields()` para franquicia: agregar `message` como texto debajo de los datos estructurados
- Para empleo: pasar las branches como prop o hacer query para resolver `employment_branch_id` a nombre

Archivo `useContactMessages.ts`: agregar los dos campos faltantes al tipo.

No se necesitan cambios de base de datos, solo de presentacion.

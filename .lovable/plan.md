

## Mensajes de WhatsApp personalizados y editables por tipo de consulta

### Que se va a hacer

Cuando apretes "WhatsApp" en un mensaje de contacto, se va a abrir WhatsApp con un mensaje pre-armado segun el tipo de consulta (franquicia, empleo, proveedor, etc.). Ademas, vas a poder editar esas plantillas desde la plataforma sin tocar codigo.

### Flujo del usuario

1. Vas a `/mimarca/mensajes` y apretas "WhatsApp" en una consulta de franquicia
2. Se abre WhatsApp con el mensaje ya armado, reemplazando `[NOMBRE]` por el nombre real del contacto
3. Si queres cambiar el mensaje, vas a una seccion de configuracion y lo editas
4. Cada tipo de consulta (franquicia, empleo, proveedor, pedidos, consulta, otro) tiene su propia plantilla

### Variables disponibles en las plantillas

- `[NOMBRE]` - Nombre del contacto
- `[EMAIL]` - Email del contacto
- `[TELEFONO]` - Telefono del contacto

### Cambios

**1. Base de datos - Nueva tabla `whatsapp_templates`**

```text
whatsapp_templates
- id (UUID, PK)
- subject_type (TEXT, UNIQUE) -> 'franquicia', 'empleo', 'proveedor', 'pedidos', 'consulta', 'otro'
- template_text (TEXT) -> El mensaje con variables como [NOMBRE]
- is_active (BOOLEAN, default true)
- updated_by (UUID, FK auth.users)
- created_at, updated_at (TIMESTAMPTZ)
```

RLS: Solo superadmin y coordinador pueden leer/editar.

Se pre-cargan los 6 tipos con el mensaje de franquicia que ya tenes definido y mensajes genericos para el resto.

**2. `src/pages/admin/ContactMessagesPage.tsx`**

- Modificar `handleWhatsApp()` para buscar la plantilla del tipo de consulta, reemplazar `[NOMBRE]` por `message.name`, y agregar `?text=` al link de WhatsApp
- Agregar un boton/icono de "Configurar plantillas" en el header de la pagina

**3. Nuevo componente: `src/components/admin/WhatsAppTemplatesDialog.tsx`**

- Dialog/modal que muestra las 6 plantillas en tabs o acordeon
- Cada una con un textarea editable
- Boton guardar que actualiza la tabla
- Preview en tiempo real del mensaje con datos de ejemplo

**4. Nuevo hook: `src/hooks/useWhatsAppTemplates.ts`**

- Query para traer todas las plantillas
- Mutation para actualizar una plantilla
- Funcion helper `getMessageForContact(subjectType, contactName)` que reemplaza variables

### Datos iniciales

Se van a cargar estos mensajes predeterminados:

- **Franquicia**: El mensaje que ya tenes definido (el largo con las 3 preguntas)
- **Empleo**: "Hola [NOMBRE]! Gracias por postularte en Hoppiness Club. Recibimos tu CV y lo estamos revisando. Te contactamos pronto!"
- **Proveedor**: "Hola [NOMBRE]! Gracias por contactarnos como proveedor. Recibimos tu informacion y la estamos evaluando."
- **Pedidos**: "Hola [NOMBRE]! Recibimos tu consulta sobre tu pedido. Danos un momento para revisarlo."
- **Consulta**: "Hola [NOMBRE]! Gracias por escribirnos. Recibimos tu mensaje y te respondemos a la brevedad."
- **Otro**: "Hola [NOMBRE]! Gracias por contactar a Hoppiness Club. Recibimos tu mensaje."

### Detalle tecnico

- La tabla es liviana (6 filas fijas), no necesita paginacion
- El reemplazo de variables se hace en el frontend antes de abrir el link
- Se usa `encodeURIComponent()` para que el mensaje se envie correctamente por URL
- El link final queda: `whatsapp://send?phone=54XXXXXXXXXX&text=Hola%20Juan...`




# Plan Fusionado: Página de Mensajes de Contacto

## Resumen Ejecutivo

Crear una página completa de gestión de mensajes de contacto combinando:
- **De Claude:** Badge de no leídos en sidebar, botón WhatsApp directo, estados simples, UX enfocada en acción rápida
- **De Lovable:** Estructura de datos por tipo, expansión con campos específicos, arquitectura siguiendo patrones existentes

---

## Archivos a Crear

### 1. `src/pages/admin/ContactMessagesPage.tsx`

Página principal con:
- Header con título y botón de exportar CSV
- Tabs de filtro: Todos | Franquicias | Empleo | Proveedores | Otros
- Checkbox "Solo no leídos"
- Lista de mensajes como Cards (no tabla)
- Expansión inline con detalles según tipo

```text
┌─────────────────────────────────────────────────────────────────┐
│  📬 Mensajes de contacto                        [Exportar CSV]  │
├─────────────────────────────────────────────────────────────────┤
│  [Todos (12)] [Franquicias (3)] [Empleo (5)] [Otros (4)]       │
│  ☑ Solo no leídos                                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 🟠 NUEVO │ Juan Pérez           │ Franquicia │ Hace 2hs  │  │
│  │          │ juan@email.com                                 │  │
│  │          │ [📱 WhatsApp] [✓ Marcar leído] [📂 Archivar]  │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ ⚪ LEÍDO │ María García         │ Empleo     │ Hace 1 día│  │
│  │          │ CV adjunto: curriculum.pdf                     │  │
│  │          │ [📱 WhatsApp] [📂 Archivar]                    │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2. `src/hooks/useContactMessages.ts`

Hook con:
- Query de mensajes con filtros
- Mutación para marcar leído
- Mutación para archivar
- Query de conteo de no leídos (para badge)

---

## Archivos a Modificar

### 3. `src/components/admin/AdminSidebar.tsx`

Agregar item "Mensajes" con badge dinámico de no leídos:

```tsx
// Nuevo import
import { MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Query para contar no leídos
const { data: unreadCount } = useQuery({
  queryKey: ['unread-messages-count'],
  queryFn: async () => {
    const { count } = await supabase
      .from('contact_messages')
      .select('*', { count: 'exact', head: true })
      .is('read_at', null)
      .neq('status', 'archived');
    return count || 0;
  },
  refetchInterval: 60000, // Refrescar cada minuto
});

// Nuevo item antes de Comunicados (línea ~116)
<Link to="/mimarca/mensajes">
  <Button variant={...} className="w-full justify-start">
    <MessageSquare className="w-4 h-4 mr-3" />
    Mensajes
    {unreadCount > 0 && (
      <Badge className="ml-auto bg-orange-500">{unreadCount}</Badge>
    )}
  </Button>
</Link>
```

### 4. `src/App.tsx`

Agregar ruta:

```tsx
// Línea ~43 - Nuevo import
import ContactMessagesPage from "./pages/admin/ContactMessagesPage";

// Línea ~126 - Nueva ruta dentro de /mimarca
<Route path="mensajes" element={<ContactMessagesPage />} />
```

### 5. `supabase/functions/contact-notification/index.ts`

Corregir URL del botón en el email (línea 82):

```typescript
// ANTES
const adminUrl = `https://hoppiness-hub-platform.lovable.app/admin/mensajes`;

// DESPUÉS
const adminUrl = `https://hoppiness-hub-platform.lovable.app/mimarca/mensajes`;
```

---

## Archivos a Eliminar

### 6. `docs/PERMISSIONS_ARCHITECTURE.md`

Razón: Documenta un sistema de permisos granulares (55+ keys, tablas `permission_definitions`, `user_branch_permissions`) que **nunca se implementó**. El sistema real usa roles fijos en `user_roles_v2` con permisos derivados en `usePermissionsV2.ts`. Mantener este documento causa confusión arquitectónica.

---

## Detalle Técnico de ContactMessagesPage

### Estados del mensaje

| Estado | Badge | Color | Descripción |
|--------|-------|-------|-------------|
| Nuevo | 🟠 NUEVO | orange | read_at IS NULL |
| Leído | ⚪ LEÍDO | gray | read_at IS NOT NULL, status != 'archived' |
| Archivado | (oculto) | - | status = 'archived' |

### Tipos de mensaje y sus campos

| Tipo | Ícono | Campos específicos |
|------|-------|-------------------|
| franquicia | 🟣 | franchise_has_zone, franchise_has_location, franchise_investment_capital |
| empleo | 🟢 | employment_position, employment_cv_link, attachment_url |
| proveedor | 🟠 | message (productos/servicios ofrecidos) |
| pedidos | 🔴 | order_number, order_date, order_issue |
| consulta | 🔵 | message |

### Acciones por mensaje

1. **WhatsApp** - Abre `https://wa.me/54{phone}` en nueva pestaña
2. **Marcar leído** - Actualiza `read_at = now()`
3. **Archivar** - Actualiza `status = 'archived'`

### Query principal

```typescript
const { data: messages } = useQuery({
  queryKey: ['contact-messages', typeFilter, showOnlyUnread],
  queryFn: async () => {
    let query = supabase
      .from('contact_messages')
      .select('*')
      .neq('status', 'archived')
      .order('created_at', { ascending: false });
    
    if (typeFilter !== 'all') {
      query = query.eq('subject', typeFilter);
    }
    
    if (showOnlyUnread) {
      query = query.is('read_at', null);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
});
```

---

## Componentes UI a Utilizar

Siguiendo el patrón de `CommunicationsPage.tsx`:

- `Card` / `CardContent` - Contenedor de cada mensaje
- `Badge` - Estados y tipos
- `Button` - Acciones
- `Skeleton` - Loading state
- `Tabs` / `TabsList` / `TabsTrigger` - Filtros por tipo
- `Checkbox` - Filtro de no leídos
- `Dialog` - Para notas internas (opcional, fase 2)

---

## Orden de Ejecución

1. **Eliminar** `docs/PERMISSIONS_ARCHITECTURE.md`
2. **Crear** `src/hooks/useContactMessages.ts`
3. **Crear** `src/pages/admin/ContactMessagesPage.tsx`
4. **Modificar** `src/App.tsx` (agregar ruta e import)
5. **Modificar** `src/components/admin/AdminSidebar.tsx` (agregar link con badge)
6. **Modificar** `supabase/functions/contact-notification/index.ts` (corregir URL)

---

## Estimación de Tiempo

| Tarea | Tiempo |
|-------|--------|
| Eliminar doc obsoleto | 1 min |
| Hook useContactMessages | 15 min |
| ContactMessagesPage | 45 min |
| Modificar App.tsx | 2 min |
| Modificar AdminSidebar | 10 min |
| Actualizar edge function | 2 min |
| **Total** | **~1.5 horas** |


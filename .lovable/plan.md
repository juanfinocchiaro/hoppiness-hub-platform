

## Fix: WhatsApp abre la app de escritorio directamente

### Problema

Todos los dominios web de WhatsApp (`wa.me`, `web.whatsapp.com`, `api.whatsapp.com`) estan siendo bloqueados por la red o el navegador. El error es `ERR_BLOCKED_BY_RESPONSE`.

### Solucion

Usar el protocolo nativo `whatsapp://send?phone=...` que abre la app de WhatsApp instalada en Windows directamente, sin pasar por ningun servidor web.

### Cambio

**Archivo:** `src/pages/admin/ContactMessagesPage.tsx`

Linea 56, cambiar:
```text
window.open(`https://web.whatsapp.com/send?phone=${fullPhone}`, '_blank');
```

Por:
```text
window.open(`whatsapp://send?phone=${fullPhone}`, '_self');
```

- `whatsapp://` es un protocolo registrado por la app de WhatsApp Desktop. Windows lo intercepta y abre la app directamente.
- Se usa `_self` en vez de `_blank` para evitar que abra una pestaña vacia innecesaria.

### Detalle tecnico

| Metodo | Problema |
|---|---|
| `wa.me` | Redirige a `api.whatsapp.com` que esta bloqueado |
| `web.whatsapp.com` | Tambien redirige a `api.whatsapp.com` |
| `whatsapp://send` | Abre la app nativa directamente, sin HTTP |

Un solo cambio de una linea.

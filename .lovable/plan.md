

# Scopear los modales del POS a su area (sin afectar el sidebar)

## Problema

Los modales (Modificadores, Registrar Pago, Cancelar Pedido, Enviar a Cocina) usan `DialogPortal` de Radix que renderiza en `document.body`. Esto hace que el overlay oscuro y el contenido se centren respecto a toda la ventana, cubriendo el sidebar de Mi Local.

## Solucion

Usar la prop `container` de Radix Portal para que los modales del POS se rendericen dentro del contenedor del POS, no en el body.

### Enfoque tecnico

1. **Crear un contexto de portal para el POS** (`POSPortalContext`) que provea una ref al contenedor
2. **Envolver el POS** en un div con `position: relative` y asignarle la ref
3. **Crear componentes wrapper** (`POSDialogContent` y `POSAlertDialogContent`) que usen la ref como `container` del portal
4. **Cambiar el overlay y content** de `fixed` a `absolute` en estos wrappers para que se posicionen relativo al contenedor del POS

### Archivos nuevos

**`src/components/pos/POSPortalContext.tsx`**
- Contexto React con `containerRef`
- Provider y hook `usePOSPortal()`

### Archivos a modificar

**`src/pages/pos/POSPage.tsx`**
- Envolver todo el return en `<POSPortalProvider>` con un div que tenga `relative` y `overflow: hidden`
- Asignar ref al div contenedor

**`src/components/pos/ModifiersModal.tsx`**
- Reemplazar `DialogContent` por `POSDialogContent` que usa el portal scoped

**`src/components/pos/RegisterPaymentPanel.tsx`**
- Idem: usar `POSDialogContent`

**`src/components/pos/AccountPanel.tsx`**
- Los `AlertDialogContent` de "Cancelar pedido" y "Enviar a cocina": usar `POSAlertDialogContent`

### Detalle de POSDialogContent

En vez de modificar los componentes globales de `ui/dialog.tsx` (que afectarian todo el sistema), crear versiones scoped:

```text
POSDialogContent:
  - Usa DialogPortal con container={posContainerRef.current}
  - Overlay: absolute inset-0 (en vez de fixed inset-0)
  - Content: absolute left-50% top-50% (en vez de fixed)

POSAlertDialogContent:
  - Igual pero para AlertDialog
```

Esto asegura que:
- El overlay oscuro solo cubre el area del POS (no el sidebar)
- El contenido del modal se centra dentro del area del POS
- No se tocan los componentes globales de UI
- Solo afecta al modulo POS

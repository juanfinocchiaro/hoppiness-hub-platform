

# Rediseno del Flujo "Nueva Venta" en POS

## Problema actual

La pantalla de Punto de Venta muestra DOS placeholders identicos ("Nueva Venta") que ocupan toda la pantalla con bordes punteados. El flujo requiere 3 pasos innecesarios:

1. Click en placeholder izquierdo o derecho
2. Se muestra formulario de canal/cliente SOLO en la columna izquierda (la derecha sigue con placeholder)
3. Click en "Comenzar venta" para desbloquear el menu

Esto es confuso, feo y lento.

## Propuesta: Flujo simplificado en 1 paso

Eliminar los placeholders gigantes. En su lugar:

- **Estado inicial**: Mostrar el formulario de canal/cliente directamente en una Card compacta en la parte superior, con el menu de productos YA VISIBLE debajo (pero deshabilitado visualmente hasta confirmar config)
- **Al confirmar**: La Card de config se colapsa a una linea resumen editable, y el menu + carrito se activan

```text
ANTES (actual)                         DESPUES (propuesto)
+------------------+------------------+ +------------------------------------------+
| [  Nueva Venta ] | [  Nueva Venta ] | | Punto de Venta                           |
| (placeholder     | (placeholder     | +------------------------------------------+
|  dashed border   |  dashed border   | | [Card: Canal y Cliente]                  |
|  gigante)        |  gigante)        | | Mostrador | Apps     Para llevar | ...    |
|                  |                  | | Llamador: [grid numeros]                 |
|                  |                  | |                    [Comenzar Venta >>]    |
|                  |                  | +------------------------------------------+
|                  |                  | |  Carrito (izq)  |  Menu productos (der)  |
|                  |                  | |  (vacio)        |  (visible, disabled)   |
+------------------+------------------+ +------------------------------------------+

DESPUES de "Comenzar Venta":
+------------------------------------------+
| Punto de Venta                           |
+------------------------------------------+
| Mostrador > Para llevar > #5  [Editar]   |
+------------------------------------------+
|  Carrito (izq)  |  Menu productos (der)  |
|  (activo)       |  (activo, clickeable)  |
+------------------------------------------+
```

## Cambios tecnicos

### Archivo: `src/pages/pos/POSPage.tsx`

**Eliminar:**
- Los dos bloques `<button>` con placeholders dashed (lineas 191-199 y 225-233)
- El estado `showConfigForm` (ya no necesario)
- La funcion `handleStartSale` (ya no necesaria)

**Nuevo layout:**
- Arriba: `OrderConfigPanel` siempre visible. En modo `compact` muestra resumen de 1 linea con boton "Editar". En modo expandido muestra el formulario completo con boton "Comenzar venta"
- Abajo: Grid de 2 columnas (carrito izq + menu der), siempre renderizadas
- El `ProductGrid` se renderiza siempre pero con `pointer-events-none opacity-50` cuando `!saleStarted`, y un overlay sutil que dice "Configura canal y cliente para empezar"
- Al hacer click en el overlay o en cualquier producto deshabilitado, scroll al config panel

### Archivo: `src/components/pos/OrderConfigPanel.tsx`

**Modificar modo `compact`:**
- Actualmente en modo compact muestra el formulario completo pero mas chico
- Nuevo comportamiento: en compact muestra una sola linea resumen:
  `Mostrador > Para llevar > Llamador #5` con un boton "Editar" que expande
- Usar un Collapsible o estado interno para toggle

### Archivos sin cambios:
- `OrderPanel.tsx` - Se mantiene igual
- `ProductGrid.tsx` - Se mantiene igual (solo se le aplica CSS condicional desde el padre)
- `PaymentModal.tsx` - Sin cambios
- `RegisterOpenModal.tsx` - Sin cambios

## Resumen de archivos

| Archivo | Cambio |
|---|---|
| `src/pages/pos/POSPage.tsx` | Eliminar placeholders, nuevo layout lineal, ProductGrid siempre visible |
| `src/components/pos/OrderConfigPanel.tsx` | Modo compact = resumen de 1 linea con toggle |

## Notas

- No se modifica logica de negocio, validaciones, ni APIs
- El flujo sigue siendo: configurar canal/cliente, luego agregar productos, luego cobrar
- Solo cambia la presentacion: todo visible desde el inicio, sin pantallas vacias

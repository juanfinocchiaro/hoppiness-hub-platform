

# Plan: Rediseno POS Inspirado en Patrones Rappi

## Contexto

El analisis compara la UX de Rappi con el POS actual de Hoppiness y propone mejoras priorizadas. Muchas cosas **ya estan implementadas** (barra sticky mobile, botones grandes de pago, botones rapidos de efectivo, canal colapsado, auto-add de productos simples). El plan se enfoca en lo que **falta**.

---

## Estado Actual vs Propuesto

| Caracteristica | Estado actual | Accion |
|---|---|---|
| Barra sticky mobile con items + total + Cobrar | Ya existe | Ninguna |
| Metodos de pago como botones grandes | Ya existe | Ninguna |
| Botones de monto rapido (efectivo) | Ya existe | Ninguna |
| Canal colapsado en header | Ya existe (Collapsible) | Ninguna |
| Auto-add productos sin modificadores | Ya existe | Ninguna |
| Cancelar pedido / Vaciar | Ya existe | Ninguna |
| Modificadores en secciones (Extras / Sin ingrediente) | Ya existe | Ninguna |
| Busqueda de productos | NO existe | **Fase 1** |
| Scroll spy en tabs de categorias | NO existe | **Fase 1** |
| Badge de cantidad en productos del carrito | NO existe | **Fase 1** |
| Montos calculados en botones de propina | NO existe | **Fase 1** |
| Tab "Frecuentes" | NO existe | **Fase 2** |
| Resumen colapsable en modal de cobro | NO existe | **Fase 2** |

---

## Fase 1 - Implementar YA (4 cambios puntuales)

### 1. Busqueda de productos
**Archivo:** `src/components/pos/ProductGrid.tsx`

- Agregar un `Input` de busqueda arriba de las tabs de categorias con icono de lupa
- Filtro en tiempo real: al tipear se filtran los items por nombre (`nombre` y `nombre_corto`)
- Al limpiar la busqueda, se restaura la vista de categorias
- Shortcut: si hay un solo resultado y se presiona Enter, se agrega directo al carrito

### 2. Scroll Spy en tabs de categorias
**Archivo:** `src/components/pos/ProductGrid.tsx`

- Usar `IntersectionObserver` para detectar que seccion de categoria esta visible en el viewport del ScrollArea
- Actualizar `activeCategory` automaticamente al scrollear
- La tab activa se resalta visualmente (ya existe el estilo, solo falta la logica de deteccion)

### 3. Badge de cantidad en productos del carrito
**Archivos:** `src/components/pos/ProductGrid.tsx`, `src/pages/pos/POSPage.tsx`

- Pasar `cart` como prop a `ProductGrid`
- Calcular cantidad total por `item_carta_id` en el carrito
- Si cantidad > 0, mostrar un badge numerico (circulito con numero) sobre la esquina superior derecha de la card del producto
- Cambiar el borde de la card a `border-primary` cuando esta en el carrito

### 4. Montos calculados en botones de propina
**Archivo:** `src/components/pos/TipInput.tsx`

- Cambiar el label de los botones de `10%` a `10% - $X.XXX` mostrando el monto calculado
- Reducir texto si es necesario para que entre bien

---

## Fase 2 - Implementar Pronto (2 mejoras)

### 5. Tab "Frecuentes"
**Archivos:** `src/components/pos/ProductGrid.tsx`, nuevo hook `src/hooks/pos/useFrequentItems.ts`

- Crear hook que consulte los items mas vendidos del local (basado en tabla de pedidos/ordenes)
- Agregar una primera tab con icono estrella que muestre los 6-8 productos mas vendidos
- Si no hay datos suficientes, no mostrar la tab

### 6. Resumen colapsable en modal de cobro
**Archivo:** `src/components/pos/PaymentModal.tsx`

- Agregar un `Collapsible` arriba del total que muestre un resumen del pedido
- Cerrado por defecto: "3 items - Victoria Burger, Cheese Burger..."
- Expandido: lista detallada con cantidades y precios
- Boton de cobro con el total incluido: "Confirmar cobro - $24.500"

---

## Detalles Tecnicos

### Scroll Spy (punto 2)
Se usara `IntersectionObserver` con `threshold: 0.3` observando cada seccion de categoria. El observer actualizara el `activeCategory` cuando una seccion entre en el viewport. Se necesita obtener la referencia del viewport del `ScrollArea` (el div con `overflow`).

### Badge de cantidad (punto 3)
Se recibira `cart: CartItem[]` como prop en `ProductGrid`. Se calculara un `Map<item_carta_id, number>` con `useMemo` para busqueda O(1). El badge sera un `<span>` posicionado absolute sobre la card.

### Busqueda (punto 1)
Filtro local sobre los items ya cargados en memoria (no requiere query adicional). Se usa `useState` para el termino de busqueda y `useMemo` para filtrar `byCategory`. Cuando hay texto de busqueda, se ignora la agrupacion por categorias y se muestra una grilla plana de resultados.

---

## Lo que NO se implementa (y por que)

- **Cross-sell ("Agregás papas?")**: El cajero sugiere verbalmente, no la interfaz
- **Modificadores como side panel en desktop**: El Dialog actual funciona bien y es mas rapido para el cajero. Cambiar a side panel agrega complejidad sin beneficio claro en el flujo POS
- **Sonido/vibracion**: Mejora menor, se puede agregar despues
- **Temas visuales POS vs gestion**: No es prioritario


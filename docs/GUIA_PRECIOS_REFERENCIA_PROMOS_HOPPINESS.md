# Guía de Implementación: Precios de Referencia, Promociones y su Impacto en POS, Centro de Costos y RDO

**Proyecto:** Hoppiness Hub
**Fecha:** Febrero 2026
**Versión:** 1.0

---

## 1. Concepto General

### Qué queremos lograr

Hoppiness tiene productos que solo existen como "Promoción en Efectivo" (no tienen una versión a precio regular en otra categoría). Necesitamos:

1. Que el **cajero y el cliente** vean claramente que están accediendo a un precio promocional (precio tachado + precio real en el POS)
2. Que el **franquiciado** sepa cuánto está resignando por la promo (en Centro de Costos)
3. Que el **RDO** refleje la venta teórica, el descuento como gasto de comercialización, y la venta real

### El campo clave: `precio_referencia`

Cada item de carta puede tener un campo opcional llamado `precio_referencia` (o `precio_sin_promo`, `precio_lista`, el nombre que prefieran).

- Es el precio que el producto "valdría" si no estuviera en promoción
- Es un campo manual que carga el franquiciado o la marca central
- Si `precio_referencia` > `precio_base` → el sistema entiende que hay descuento
- Si `precio_referencia` está vacío o es igual a `precio_base` → no hay descuento, se comporta como producto normal

### Ejemplo concreto

```
Producto: Hamburguesa Doble Argenta con papas fritas
Categoría: Promociones en Efectivo
precio_base (lo que se cobra): $15.000
precio_referencia (lo que "valdría"): $18.000
Descuento: $3.000 (17%)
```

---

## 2. Centro de Costos: Cómo se ve y se carga

### 2.1 Carga del precio de referencia

En la ficha del item de carta (donde hoy se carga precio_base, costo, etc.), agregar un campo:

```
Precio de referencia (opcional): $________
```

**Reglas:**
- Campo numérico, opcional
- Solo tiene sentido si es MAYOR que el precio_base
- Si se deja vacío, el producto no tiene descuento visible
- Puede tener un tooltip/ayuda: "Precio sin promoción. Si se completa, el POS mostrará el descuento y el RDO lo registrará como gasto de comercialización."

### 2.2 Tabla del Centro de Costos

La tabla actual muestra: Item | Costo | P. Carta (c/IVA) | P. Neto (s/IVA) | Obj. | FC% | Margen | Sugerido

**Agregar columnas o indicadores:**

**Opción A — Columna adicional:**
```
Item                         | Costo  | P. Ref.  | P. Carta | Desc.   | P. Neto  | FC%  | Margen
Hamb. Doble Argenta c/papas  | $4.959 | $18.000  | $15.000  | -$3.000 | $12.397  | 40%  | $7.438
```

**Opción B — Indicador inline (más sutil):**
```
Item                         | Costo  | P. Carta (c/IVA)       | P. Neto  | FC%  | Margen
Hamb. Doble Argenta c/papas  | $4.959 | $15.000 (ref: $18.000) | $12.397  | 40%  | $7.438
```

**Opción C — Badge en la categoría (recomendada):**
Mantener la tabla como está, pero en el header de la categoría "PROMOCIONES EN EFECTIVO" agregar un resumen:

```
▼ PROMOCIONES EN EFECTIVO (1)    CMV 40.0%  |  Obj 40.0%  |  Margen $7.438  |  🏷 Desc. prom. -$3.000 (17%)
```

Y en el detalle expandido del item, mostrar:
```
Precio de carta:     $15.000
Precio referencia:   $18.000
Descuento promo:     -$3.000 (17%)
```

**Recomendación:** Ir por la Opción C porque no rompe la tabla existente y agrupa la info de descuento en un lugar lógico. El detalle expandido del item ya existe para mostrar la ficha técnica; ahí se agrega la info de referencia.

### 2.3 Cálculos importantes

```
descuento_unitario = precio_referencia - precio_base
porcentaje_descuento = (descuento_unitario / precio_referencia) × 100
```

**El FC% y el Margen siempre se calculan sobre el precio_base (lo que realmente se cobra).** El precio_referencia NO afecta el cálculo de food cost. Esto es importante: el FC% debe reflejar la realidad operativa, no una ficción.

---

## 3. POS: Cómo se ve el producto con descuento

### 3.1 Card del producto en la grilla

Cuando un item tiene `precio_referencia` > `precio_base`, la card del producto cambia:

**Card normal (sin descuento):**
```
┌─────────────────┐
│    [imagen]      │
│                  │
│ Victoria Burger  │
│ $ 12.100         │
└─────────────────┘
```

**Card con descuento (tiene precio_referencia):**
```
┌─────────────────┐
│    [imagen]      │
│           🏷-17% │
│ Doble Argenta   │
│ ̶$̶1̶8̶.̶0̶0̶0̶         │
│ $ 15.000         │
└─────────────────┘
```

**Elementos visuales:**
- Badge de descuento ("-17%") en esquina superior derecha de la card, fondo de color (rojo, naranja o amarillo como Rappi)
- Precio de referencia tachado en gris/muted, tamaño más chico
- Precio real en el color y tamaño habitual (o incluso un poco más grande/bold para enfatizar)
- El nombre del producto se mantiene igual

**Inspiración directa de Rappi:**
Rappi muestra: `$31.200,00` en bold + badge amarillo `-20%` + `$39.000,00` tachado en gris. Usar el mismo patrón adaptado a la estética de Hoppiness.

### 3.2 En el carrito (OrderPanel)

Cuando el item con descuento está en el carrito:

```
Doble Argenta c/papas         ×1
$̶1̶8̶.̶0̶0̶0̶  $15.000    [- 1 +] 🗑
🏷 Promo efectivo -17%
```

O más sutil:
```
Doble Argenta c/papas         ×1
$15.000 (ref. $18.000)  [- 1 +] 🗑
```

**Recomendación:** Ir por la versión sutil en el carrito. El cajero ya sabe que es promo; el carrito debe ser escaneable rápidamente. El precio tachado prominente tiene más sentido en la grilla de productos (donde el cajero/cliente necesita ver la oferta) que en el carrito (donde ya decidió).

### 3.3 En el modal de cobro (PaymentModal)

En el desglose del total antes de confirmar cobro:

```
Subtotal (precio referencia):   $18.000
Desc. promo efectivo:           -$3.000
─────────────────────────────
Total a cobrar:                 $15.000
Propina:                        +$1.500
─────────────────────────────
TOTAL:                          $16.500
```

Esto le da al cajero (y al cliente si ve la pantalla) transparencia total de lo que está pagando y lo que se está ahorrando.

### 3.4 Regla de negocio: Promo solo en efectivo

Si la categoría se llama "Promociones en EFECTIVO", hay una regla implícita: ¿el descuento aplica solo si el método de pago es efectivo?

**Dos enfoques:**

**Enfoque A — Restricción dura:** Si el pedido tiene items de "Promo efectivo" y el cajero elige tarjeta/QR, el sistema advierte: "Este pedido tiene promos de efectivo. ¿Cobrar al precio de referencia ($18.000) o mantener promo?" Esto es complejo y puede generar fricción.

**Enfoque B — Confianza en el cajero (recomendado):** El cajero sabe que la promo es de efectivo. Si el cliente quiere pagar con tarjeta, el cajero simplemente le cobra el producto regular (si existe) o le informa que la promo es solo en efectivo. El sistema no restringe, pero el nombre de la categoría y el badge dejan claro que es promo de efectivo.

**Enfoque C — Advertencia suave:** Al cobrar con método distinto a efectivo, si hay items de categoría "promo efectivo", mostrar un aviso no bloqueante: "⚠️ Hay productos de promo efectivo en el pedido. ¿Continuar?" El cajero decide.

**Recomendación:** Enfoque C. Es informativo sin ser bloqueante.

---

## 4. RDO: Cómo se refleja la promoción

### 4.1 Lógica de registro de la venta

Cuando se registra un pedido con items que tienen `precio_referencia`:

```
Para cada item del pedido:
  si tiene precio_referencia > precio_base:
    venta_teorica += precio_referencia × cantidad
    descuento_promo += (precio_referencia - precio_base) × cantidad
    venta_real += precio_base × cantidad
  sino:
    venta_teorica += precio_base × cantidad
    venta_real += precio_base × cantidad
```

### 4.2 Cómo se muestra en el RDO

**En la sección de Ventas:**

```
VENTAS
  Venta teórica (a precio referencia):     $450.000
  Descuento promo efectivo:                 -$45.000
  ─────────────────────────────────────────
  Venta real (ingreso en caja):             $405.000
```

**En la sección de Gastos / Comercialización:**

```
GASTOS DE COMERCIALIZACIÓN
  Descuento promo efectivo:                  $45.000
  Publicidad:                                $15.000
  ...
  ─────────────────────────────────────────
  Total comercialización:                    $60.000
```

**En el P&L simplificado:**

```
Venta teórica:                              $450.000   (100%)
- Desc. promo efectivo:                      -$45.000   (-10%)
= Venta neta:                               $405.000   (90%)
- Costo de mercadería (CMV):                -$162.000   (-36%)
= Contribución marginal:                    $243.000   (54%)
- Gastos de personal:                       -$120.000
- Gastos operativos:                         -$50.000
- Comercialización (incluye promo):          -$60.000
= Resultado operativo:                       $13.000
```

### 4.3 Detalle por categoría de descuento

Es útil que el RDO desglose los descuentos por tipo/categoría:

```
DETALLE DESCUENTOS DE COMERCIALIZACIÓN
  Promo efectivo:           $45.000   (150 unidades × $3.000 desc. promedio)
  Descuento empleados:       $8.000
  Cortesías:                 $3.000
  ──────────────────────
  Total:                    $56.000
```

Esto permite al franquiciado ver si la promo de efectivo le está costando demasiado y tomar decisiones.

### 4.4 KPIs relevantes

El RDO debería mostrar algunos indicadores asociados:

- **% ventas con promo:** Qué porcentaje de las ventas usó promo efectivo
- **Descuento promedio:** Monto promedio de descuento por transacción con promo
- **Impacto en margen:** Margen con promo vs margen teórico sin promo

```
Ejemplo:
  Ventas totales: 200 pedidos
  Con promo efectivo: 75 pedidos (37.5%)
  Descuento total: $45.000
  Descuento promedio por pedido promo: $600
  Margen real: 54% | Margen sin promo (teórico): 60%
```

---

## 5. Flujo Completo: De la Carga al Reporte

### Paso 1: La marca o franquiciado crea el producto
```
Centro de Costos → Nuevo item
  Nombre: Hamburguesa Doble Argenta con papas fritas
  Categoría: Promociones en Efectivo
  Precio base (lo que se cobra): $15.000
  Precio referencia (sin promo): $18.000  ← NUEVO CAMPO
  Costo: $4.959
```

### Paso 2: El cajero ve el producto en el POS
```
Grilla de productos:
  [Imagen] Doble Argenta c/papas
  $̶1̶8̶.̶0̶0̶0̶  $15.000  🏷 -17%
```

### Paso 3: El cajero lo agrega al carrito
```
Carrito:
  Doble Argenta c/papas ×1    $15.000
  (ref. $18.000 — promo efectivo)
```

### Paso 4: Al cobrar, el desglose muestra
```
Subtotal ref.:     $18.000
Desc. promo:       -$3.000
Total a cobrar:    $15.000
```

### Paso 5: Se registra la venta internamente
```
pedido.total = $15.000 (lo que entró en caja)
pedido.descuento_promo = $3.000 (para el RDO)
pedido.venta_teorica = $18.000 (para el RDO)
```

### Paso 6: En el RDO del día/mes
```
Venta teórica:        $450.000
Desc. promo efectivo: -$45.000
Venta real:           $405.000
...
Gastos comercializ.:   $45.000 (incluye las promos)
```

---

## 6. Casos Borde a Considerar

### 6.1 ¿Qué pasa si cambia el precio de referencia?
Si la marca actualiza el precio_referencia de $18.000 a $20.000, los pedidos anteriores no se afectan. Cada pedido debe guardar el precio_referencia vigente al momento de la venta, no recalcularse después.

### 6.2 ¿Qué pasa si se quita la promo?
Si un producto deja de ser promo, se puede blanquear el campo precio_referencia o igualarlo al precio_base. El POS deja de mostrar el tachado automáticamente.

### 6.3 ¿Se puede tener descuento en categorías que no son "promo efectivo"?
Sí. El campo precio_referencia es genérico. Si mañana hay una categoría "Happy Hour" con descuento, funciona igual. Lo que cambia es el label en el RDO: en vez de "Desc. promo efectivo" diría "Desc. Happy Hour". Para esto, el tipo de descuento debería derivarse de la categoría del producto, o tener un campo `tipo_descuento` en la categoría.

### 6.4 ¿Descuento acumulable con descuento manual?
Si el cajero aplica un descuento manual (cortesía, empleado) SOBRE un producto que ya tiene promo, los descuentos se acumulan. En el RDO aparecerían como líneas separadas:
```
Desc. promo efectivo:     $3.000
Desc. empleado:           $1.500
Total descuentos:         $4.500
```

### 6.5 ¿Qué pasa con el split payment?
Si un pedido mixto (items promo + items normales) se paga parte en efectivo y parte en tarjeta, el descuento de promo efectivo aplica sobre los items promo independientemente del método de pago (Enfoque C: advertencia suave). Es responsabilidad del cajero informar al cliente.

---

## 7. Resumen de Cambios Necesarios

### En el modelo de datos (para que Lovable decida la implementación):
- Agregar concepto de "precio de referencia" al item de carta
- Al registrar un pedido, guardar el descuento de promo junto con el pedido
- En el RDO, poder calcular venta teórica vs venta real

### En la UI del Centro de Costos:
- Campo "Precio de referencia" en la ficha del item (opcional)
- Indicador de descuento en la tabla de items cuando aplique

### En la UI del POS:
- Card de producto con precio tachado + badge de descuento cuando tiene precio_referencia
- Desglose de descuento en el carrito (sutil) y en el modal de cobro (explícito)
- Advertencia suave al cobrar con método no-efectivo si hay items de promo efectivo

### En la UI del RDO:
- Línea de "Venta teórica" antes de la venta neta
- Línea de "Descuento promo efectivo" restando
- En gastos de comercialización: el mismo monto como gasto
- KPIs de impacto de la promo (% pedidos con promo, descuento promedio, impacto en margen)

---

## 8. Glosario

| Término | Definición |
|---------|-----------|
| `precio_base` | Lo que efectivamente se cobra al cliente. Es el precio real del producto. |
| `precio_referencia` | Lo que el producto "valdría" sin la promoción. Campo manual, opcional. |
| `descuento_promo` | La diferencia: precio_referencia - precio_base. Es lo que se resigna. |
| `venta_teorica` | Suma de precio_referencia × cantidad para todos los items. Lo que se hubiera vendido sin promo. |
| `venta_real` | Suma de precio_base × cantidad. Lo que entró en caja. |
| `gasto_comercializacion` | El descuento_promo visto como gasto. Mismo monto, diferente ubicación en el P&L. |

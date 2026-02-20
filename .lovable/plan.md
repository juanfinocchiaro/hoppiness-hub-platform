

# Auditoria UX & Plan de Rediseno Premium - Hoppiness Hub

---

## FASE 1: Diagnostico

### 1.1 Estado Actual de la Experiencia del Cliente Final

**Flujo actual de pedir una hamburguesa online:**
El usuario hace clic en "Pedi tu Hamburguesa" en la landing, va a `/pedir` que muestra una lista de locales con cards basicas (nombre + direccion). Si el local tiene webapp activa, entra a un flujo propio con seleccion de servicio (retiro/delivery/comer aca) y luego un menu con categorias y buscador. Si no tiene webapp, redirige a MasDelivery (servicio externo).

**Problemas detectados:**

| Problema | Impacto | Referencia McDonald's |
|---|---|---|
| Landing hero sin foto de producto real - fondo es una pared azul con azulejos | El visitante no ve ni una hamburguesa en lo primero que aparece. McDonald's muestra una Big Mac en mano como hero | Hero con producto protagonista |
| Imagenes de la landing son genericas (`hoppiness-43.webp`, `burger-64.webp`) sin nombres de producto | No generan antojo porque no comunican que hamburguesa es | McDonald's nombra cada producto en la foto |
| La pagina `/pedir` es una lista fria de locales sin fotos, sin menu previo, sin sensacion de "quiero eso" | Zero food porn antes de elegir local. El usuario tiene que decidir donde pedir sin saber que hay | McDonald's muestra productos primero, despues el local |
| ProductCard en la webapp usa imagenes de 80x80px (w-20 h-20) - muy chicas para generar antojo | Las fotos que me pasaste son espectaculares pero aparecen en miniatura | McDonald's usa cards grandes con fotos prominentes |
| No hay tracking de pedido, historial, favoritos, ni programa de fidelizacion | El flujo termina en el checkout. No hay post-compra | McDonald's tiene tracking en tiempo real + historial + My McDonald's |
| Checkout no tiene integracion con MercadoPago ni pago en la plataforma | El pago es "en persona", no hay pago digital | McDonald's tiene pago integrado |
| No hay seccion de "Nuestro Menu" en la landing que muestre los productos con fotos profesionales | El visitante casual nunca ve el menu a menos que entre al flujo de pedido | McDonald's tiene seccion "Productos" en el nav principal |

**Buyer Personas vs. Experiencia Actual:**
- **Fede (universitario):** Busca rapidez. El flujo actual tiene 3 pasos antes de ver el menu (landing > /pedir > elegir local > elegir servicio). McDonald's tiene 2 (home > pedir).
- **Santi (familia):** Quiere ver opciones claras. Las imagenes son muy chicas y no hay filtros por tipo (clasicas, dobles, veggies).
- **Nacho (foodie):** Quiere descubrir productos. No hay historias de producto, ni descripcion de ingredientes detallada, ni seccion "nuevos" o "destacados".

### 1.2 Estado de la Experiencia Operativa

**Lo que funciona bien:**
- Fichaje con QR + PIN + GPS + selfie: flujo completo y robusto
- Sistema de reglamentos con firma y bloqueo automatico a los 5 dias
- Comunicados con marcado de lectura y filtro por rol
- Horarios con calendario mensual + solicitudes de dias libres
- Mi Cuenta (CuentaHome) tiene un diseno limpio con PendingItemsPanel y BranchWorkCards

**Donde hay friccion:**
- El ManagerDashboard tiene un modal de carga de ventas basico (solo monto total) - ya identificado y en plan de reemplazo con shift_closures
- El sidebar de Mi Local tiene muchos items sin agrupacion visual clara

### 1.3 Coherencia de Marca

**Colores:** La paleta esta correctamente implementada (#00139b como primary, #ff521d como accent, #ffd41f como warning). CSS variables bien configuradas.

**Tipografia:** SpaceMono se usa como `font-brand` en titulos. Sin embargo, **HamburgHand no esta implementada en absoluto**. Es la tipografia principal de la marca (handwritten, para titulos destacados) y esta completamente ausente del CSS y de la plataforma. Learning Curve Bold tampoco esta implementada.

**Personalidad Creador/Explorador/Rebelde:** La landing actual es demasiado "corporativa franquicia". Casi la mitad de la landing esta dedicada a franquicias (Sumate, FranchiseHero, WhyHoppiness, Timeline) cuando el publico principal (Fede, Santi, Nacho) viene a pedir hamburguesas. La seccion B2B domina sobre el B2C.

**Problema critico de proporcion en la landing:**
- Secciones B2C (para clientes): Hero + Stats + Culto al Sabor + Premios + Medios + Clubes + Spotify + Reviews = ~8 secciones
- Secciones B2B (para franquiciados): Separador + Sumate + FranchiseHero + WhyHoppiness + Timeline = ~5 secciones
- El 40% de la landing es contenido de franquicias. Un cliente que quiere pedir una hamburguesa tiene que scrollear por todo eso.

### 1.4 Gap Analysis vs McDonald's

| Feature | McDonald's | Hoppiness | Gap |
|---|---|---|---|
| Hero con producto | Foto real de Big Mac en mano, CTAs claros | Pared de azulejos azules, logo chico | Critico |
| Seccion "Productos" en nav | Si, con fotos grandes, categorias | No existe en la landing | Critico |
| Fotos de productos en menu | Grandes (~200px), fondo limpio, apetitosas | 80x80px, cortadas | Alto |
| Pago integrado | MercadoPago, tarjeta, efectivo in-app | Solo "pago en local" o MasDelivery | Alto |
| Tracking de pedido | Tiempo real con estados | No existe | Medio |
| Programa fidelizacion | My McDonald's con puntos | No existe | Medio (Horizonte 2) |
| App nativa | Si | No | Bajo (Horizonte 3) |

---

## FASE 2: Plan de Accion Priorizado

### Horizonte 1 - Quick Wins (1-2 semanas)

#### 1.1 Reemplazar hero de la landing con foto de producto real
- **Que:** Usar las fotos profesionales que subiste (ej: `resultado.jpg` o `Foto_Hero.jpg`) como background del hero en lugar de `hero-wall.webp` (pared de azulejos). Alternativamente, hacer un hero split con la pared a la izquierda y una hamburguesa grande a la derecha.
- **Por que:** El visitante tiene que ver UNA HAMBURGUESA en el primer segundo. La pared azul es branding pero no genera antojo.
- **Para quien:** Fede, Santi, Nacho (todos los clientes)
- **Referencia McDonald's:** Hero con Big Mac en mano, fondo oscuro, texto minimo
- **Complejidad:** Baja - copiar asset + cambiar `backgroundImage` en `Index.tsx` linea 40
- **Archivos:** `src/pages/Index.tsx`, copiar `user-uploads://Foto_Hero.jpg` a `src/assets/`

#### 1.2 Agregar tipografia HamburgHand al sistema
- **Que:** Registrar HamburgHand como @font-face en el CSS y crear clase `.font-display` para usarla en titulos destacados de la landing (hero, secciones principales). Dejar SpaceMono como `.font-brand` para subtitulos y stats.
- **Por que:** HamburgHand es la tipografia principal del manual de marca y le da el caracter "Creador/Rebelde" que falta. Sin ella, la plataforma se siente generica.
- **Para quien:** Todos los visitantes
- **Complejidad:** Baja - agregar @font-face + cambiar clases en landing
- **Archivos:** `src/index.css`, `src/pages/Index.tsx`, copiar fuentes de `user-uploads://` a `public/fonts/`

#### 1.3 Agregar seccion "Nuestro Menu" a la landing con fotos profesionales
- **Que:** Crear una seccion tipo galeria/grid entre "Culto al Sabor" y "Premios" que muestre las categorias de hamburguesas (Clasicas, Originales, Mas Sabor, Veggies, Ultrasmash) con fotos grandes de las que subiste. Cada categoria con 2-3 productos estrella y boton "Ver Menu Completo" que lleve a `/pedir`.
- **Por que:** El visitante nunca ve el menu actual a menos que entre al flujo de pedido. Mostrar los productos en la landing genera antojo y conversion.
- **Para quien:** Fede (quiere ver rapido), Nacho (quiere descubrir)
- **Referencia McDonald's:** Seccion "Productos" con grid de categorias
- **Complejidad:** Media - componente nuevo + copiar ~15 assets
- **Archivos:** Crear `src/components/landing/MenuShowcaseSection.tsx`, modificar `src/pages/Index.tsx`

#### 1.4 Hacer fotos de producto mas grandes en la webapp de pedidos
- **Que:** En `ProductCard.tsx`, cambiar el tamano de imagen de `w-20 h-20` (80px) a `w-28 h-28` (112px) o usar un layout de card mas grande tipo McDonald's con la foto arriba y la info abajo.
- **Por que:** Las fotos que me pasaste son espectaculares (fondo beige profesional, iluminacion perfecta). Mostrarlas a 80px es un desperdicio. A 112px+ generan antojo.
- **Para quien:** Todos los que usan la webapp de pedidos
- **Referencia McDonald's:** Cards con fotos de ~200px
- **Complejidad:** Baja - cambiar clases CSS en `ProductCard.tsx`
- **Archivos:** `src/components/webapp/ProductCard.tsx`

#### 1.5 Reorganizar la landing: B2C primero, B2B separado
- **Que:** Mover las secciones de franquicias (SumateSection, FranchiseHero, WhyHoppinessSection, TimelineSection) a la pagina `/franquicias` que ya existe y es excelente. En la landing dejar solo un CTA simple tipo "Queres tu propio Hoppiness? Conoce nuestras franquicias" con un link.
- **Por que:** El 40% de la landing actual es B2B. Un cliente normal (95% del trafico) no quiere ver info de franquicias al scrollear. Esto diluye el CTA principal ("Pedi tu hamburguesa").
- **Para quien:** Fede, Santi, Nacho - la landing se vuelve 100% enfocada en el cliente
- **Complejidad:** Baja - remover imports y secciones de `Index.tsx`
- **Archivos:** `src/pages/Index.tsx`

#### 1.6 Agregar fotos de locales a la seccion "Nuestros Clubes"
- **Que:** Usar las fotos de fachadas/interiores que subiste (GP.jpg, MAN.jpg, NVC.jpg, VA.jpg, VCP.jpg) en las cards de `LocationsSection.tsx`. Actualmente las cards solo tienen texto.
- **Por que:** Las fotos de los locales son muy lindas y le dan vida a la seccion. Una card con foto del local + nombre + horario + boton "Pedir" es mucho mas atractiva que solo texto.
- **Para quien:** Todos los visitantes
- **Complejidad:** Media - requiere mapear fotos a sucursales y redisenar la card
- **Archivos:** `src/components/landing/LocationsSection.tsx`, copiar assets

### Horizonte 2 - Evolucion (1-2 meses)

#### 2.1 Rediseno del flujo de pedido: menu primero, local despues
- **Que:** Invertir el flujo: en vez de "elegir local > elegir servicio > ver menu", mostrar el menu completo con fotos grandes y precios, y al momento del checkout preguntar local y servicio. O al menos, mostrar un preview del menu en la pagina de seleccion de local.
- **Por que:** El usuario quiere ver QUE hay antes de decidir DONDE pedir. Fuerza a elegir local sin contexto.
- **Complejidad:** Alta

#### 2.2 Integracion de pago con MercadoPago
- **Que:** Agregar checkout con MercadoPago (Checkout Pro o Checkout Bricks) para pago online.
- **Complejidad:** Alta

#### 2.3 Tracking de pedido en tiempo real
- **Que:** Despues del pago, mostrar pantalla con estados (Recibido > En preparacion > Listo > En camino) usando Supabase Realtime.
- **Complejidad:** Alta

#### 2.4 Pagina "Nuestro Menu" completa
- **Que:** Una pagina publica `/menu` con todas las hamburguesas, papas, salsas y bebidas con fotos grandes, descripciones y precios. Sin necesidad de elegir local.
- **Complejidad:** Media

### Horizonte 3 - Transformacion (3-6 meses)

#### 3.1 Programa de fidelizacion "Club Hoppi"
- **Que:** Sistema de puntos por compra, niveles, recompensas y cupones.
- **Complejidad:** Alta

#### 3.2 PWA o app nativa
- **Que:** Convertir la webapp en PWA con push notifications.
- **Complejidad:** Alta

#### 3.3 Kiosco digital para comer en local
- **Que:** Interfaz de pedido para tablet/kiosco en los locales.
- **Complejidad:** Alta

---

## FASE 3: Diseno de la Experiencia del Cliente (Blueprint)

### 3.1 Landing Page Rediseñada

**Estructura propuesta:**

```text
+-----------------------------------------------+
|  HEADER: Logo | Pedir | Menu | Clubes | etc   |
+-----------------------------------------------+
|  HERO: Foto hamburguesa real (Foto_Hero.jpg)   |
|  Titulo en HamburgHand: "CULTO AL SABOR"       |
|  Subtitulo: "La hamburguesa mas premiada"       |
|  CTA: [PEDI AHORA] [VER MENU]                  |
+-----------------------------------------------+
|  STATS BANNER: 1000+/dia | 6 Clubes | 4x Cmp  |
+-----------------------------------------------+
|  MENU SHOWCASE: Grid de categorias con fotos    |
|  Clasicas | Originales | Mas Sabor | Veggies   |
|  2-3 productos por cat con foto grande + precio |
|  CTA: "Ver menu completo"                       |
+-----------------------------------------------+
|  NUESTROS CLUBES: Cards con foto de local       |
|  Nombre | Direccion | Horario | [Pedir]         |
+-----------------------------------------------+
|  PREMIOS: Timeline de campeonatos               |
+-----------------------------------------------+
|  REVIEWS: Resenas reales de Google Maps          |
+-----------------------------------------------+
|  CTA FRANQUICIAS: 1 seccion simple              |
|  "Queres tu propio Hoppiness?" [Mas info]       |
+-----------------------------------------------+
|  FOOTER                                          |
+-----------------------------------------------+
```

**Copy sugerido para el hero:**
- Titulo (HamburgHand): "CULTO AL SABOR"
- Subtitulo (SpaceMono): "La hamburguesa mas premiada de Cordoba"
- Bajada: "4 veces campeones. +15 creaciones de autor. Recetas propias desde 2018."

### 3.2 Menu Showcase Section (nueva)

Grilla de categorias con fotos destacadas:
- Cada categoria muestra 1 foto hero grande (ej: American Doble para "Clasicas")
- Nombre de la categoria en HamburgHand
- 2-3 nombres de productos debajo
- Precio desde "$X"
- Toda la seccion linkeada a /pedir

### 3.3 ProductCard Mejorada

Layout actual: horizontal, foto 80px, info al lado, boton +
Layout propuesto: foto mas grande (112-128px), mejor jerarquia visual del nombre y precio

---

## FASE 4: Recomendaciones para Paneles Internos

### 4.1 Mi Cuenta
Ya esta bien disenado. El CuentaHome con PendingItemsPanel y BranchWorkCards es claro y funcional. Recomendacion menor: agregar un saludo mas calido con la hora del dia ("Buen dia, Martin" / "Buenas noches, Martin").

### 4.2 Mi Local
El sidebar tiene buena organizacion con agrupacion por "Equipo" y "Configuracion". El ManagerDashboard esta en proceso de mejora con el nuevo sistema de cierre de turno (shift_closures). No requiere cambios urgentes.

### 4.3 Mi Marca
El BrandHome con BrandDailySalesTable y grid de sucursales es funcional. Se beneficiaria del nuevo sistema de shift_closures para mostrar desglose por categoria de hamburguesas.

### 4.4 POS
No hay POS implementado actualmente en la plataforma (los archivos en `src/pages/pos/` y `src/types/pos.ts` existen como tipos pero no hay flujo funcional). Esto es un feature nuevo para Horizonte 2-3.

---

## Resumen de Archivos a Modificar (Horizonte 1)

| Archivo | Cambio |
|---|---|
| `src/pages/Index.tsx` | Nuevo hero con foto producto, agregar MenuShowcaseSection, remover secciones B2B, agregar CTA franquicias simple |
| `src/index.css` | Agregar @font-face HamburgHand, crear `.font-display` |
| `src/components/landing/MenuShowcaseSection.tsx` | NUEVO - Grid de categorias con fotos |
| `src/components/landing/LocationsSection.tsx` | Agregar fotos de locales a las cards |
| `src/components/webapp/ProductCard.tsx` | Fotos mas grandes (w-28 h-28 minimo) |
| `public/fonts/` | Copiar tipografias HamburgHand |
| `src/assets/` | Copiar fotos de productos, locales y hero desde user-uploads |

---

## Fotos a Utilizar (Mapeo)

| Uso | Archivo |
|---|---|
| Hero landing | `Foto_Hero.jpg` o `resultado.jpg` |
| Categoria Clasicas | `American_simple.jpg`, `American_Doble.jpg` |
| Categoria Originales | `Royal_Doble.jpg`, `Cheese_Doble.jpg` |
| Categoria Mas Sabor | `Carolina.jpg`, `Django.jpg`, `Wesley.jpg` |
| Categoria Veggies | `Not_American.jpg`, `Not_Chicken.jpg` |
| Categoria Ultrasmash | `Ultra_Cheese.jpg`, `Ultra_Bacon.jpg` |
| Local Manantiales | `MAN.jpg` |
| Local Nueva Cordoba | `NVC.jpg` |
| Local General Paz | `GP.jpg` |
| Local Villa Allende | `VA.jpg` |
| Local Villa Carlos Paz | `VCP.jpg` |
| Proceso/Nosotros | `smashing.jpg`, `equipo_trabajando.jpg`, `ingredientes_frescos.jpg` |


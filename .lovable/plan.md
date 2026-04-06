

## Rediseño visual del PDF de Liquidación

### Objetivo
Transformar el PDF actual (genérico, gris, sin identidad) en un reporte profesional y visualmente atractivo, alineado con la estética de Hoppiness Club (Azul #00139b, Naranja #ff521d, Amarillo #ffd41f).

### Cambios en `src/utils/laborExport.ts` — función `exportLaborPDF`

#### 1. Header con banda de color de marca
- Franja horizontal azul (#00139b) en la parte superior de la primera página (rect de 297mm x 18mm)
- Título "LIQUIDACIÓN — Marzo 2026" en blanco sobre la franja azul, font 18pt bold
- Subtítulo con config laboral en texto claro debajo

#### 2. Stats summary como tarjetas coloreadas
- En vez de texto plano, dibujar 6 rectángulos redondeados (mini-cards) en fila debajo del header, similar a como se ven en la UI:
  - Hs Trabajadas, Hs Regulares (fondo azul claro)
  - Vacaciones, Faltas Inj. (fondo naranja/rojo suave)
  - Extras Háb, Extras Inh (fondo verde claro)
  - Con/Sin Presentismo (fondo amarillo/rojo)
- Cada mini-card con el valor grande y la etiqueta chica abajo

#### 3. Tabla principal mejorada
- Header de tabla con gradiente azul marca (#00139b) y texto blanco
- Filas alternadas con azul muy claro (#f0f4ff) vs blanco
- Bordes suaves grises claros (no grid pesado)
- Presentismo SI: badge verde con fondo verde claro
- Presentismo NO: badge rojo con fondo rojo claro
- Faltas injustificadas > 0: texto rojo bold
- Extras > 0: texto naranja (#ff521d) para destacar
- Consumos/Adelantos con formato moneda destacado

#### 4. Glossario con estilo
- Encabezado "Referencias" con acento azul (linea decorativa)
- Tabla compacta con columna izquierda en azul bold
- Fondo alternado suave

#### 5. Footer mejorado
- Linea separadora azul fina
- "HOPPINESS CLUB" en azul + fecha de generación + página
- Alineado a ambos lados (marca izquierda, página derecha)

#### 6. Colores condicionales adicionales en didParseCell
- Tardanza > 0: texto naranja
- Hs Franco > 0: texto azul (trabajó en franco)
- Hs Feriados > 0: texto violeta

### Archivo a modificar
- `src/utils/laborExport.ts` — solo la función `exportLaborPDF`


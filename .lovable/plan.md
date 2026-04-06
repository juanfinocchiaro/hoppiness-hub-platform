

## Rediseño visual del PDF individual de empleado

### Objetivo
Aplicar el mismo diseño de marca del PDF mensual (`exportLaborPDF`) al PDF individual (`exportEmployeePDF` en `laborEmployeeExport.ts`). Actualmente usa colores genéricos (azul oscuro `[41, 65, 106]`) y un layout básico sin identidad visual.

### Cambios en `src/utils/laborEmployeeExport.ts` — función `exportEmployeePDF`

#### 1. Header con banda azul marca
- Franja azul `[0, 19, 155]` en la parte superior (igual que el mensual)
- Línea de acento naranja `[255, 82, 29]` debajo
- Título "RESUMEN INDIVIDUAL — Marzo 2026" en blanco sobre la franja
- Nombre del empleado, puesto y CUIL en texto claro sobre la franja (lado derecho)

#### 2. Stats summary como tarjetas coloreadas (mini-cards)
Reemplazar la tabla "Concepto/Valor" por una grilla de mini-cards coloreadas (reutilizando `drawRoundedRect`/`drawStatCard`):
- **Hs Trabajadas / Hs Regulares** → fondo azul claro
- **Vacaciones / Faltas Inj.** → fondo naranja/rojo suave
- **Tardanza / Falta Just.** → fondo ámbar
- **Hs Feriados / Hs Franco** → fondo violeta claro
- **Extras Háb / Extras Inh** → fondo verde claro
- **Presentismo** → verde (SI) o rojo (NO)
- **Consumos / Adelantos** → fondo violeta/indigo (si se pasan como parámetro)

Disposición: 2 filas de 6 cards, o 3 filas de 4 según espacio.

Si hay desglose por puesto: tabla compacta debajo de las cards con header azul marca.

#### 3. Tabla de detalle diario mejorada
- Header con azul marca `[0, 19, 155]` y texto blanco (en vez de `[41, 65, 106]`)
- Filas alternadas con azul claro `[240, 244, 255]`
- Bordes suaves grises claros
- Colores condicionales ya existentes se mantienen (AUSENTE rojo, tardanza naranja, tipos coloreados)

#### 4. Sección de tardanzas con acento de marca
- Línea decorativa azul antes del texto de tardanzas (como el glossary del mensual)

#### 5. Footer con marca
- Línea separadora azul
- "HOPPINESS CLUB" a la izquierda en azul bold
- Fecha y página a la derecha
- En todas las páginas

#### 6. Aceptar consumos y adelantos como parámetro
- Agregar parámetro opcional `financialData?: { consumos: number; adelantos: number }` a `exportEmployeePDF`
- Mostrar Consumos y Adelantos en las stat cards
- Actualizar la llamada desde `LaborHoursSummary.tsx` para pasar los datos financieros

### Archivos a modificar
- `src/utils/laborEmployeeExport.ts` — rediseño completo de `exportEmployeePDF`
- `src/components/local/LaborHoursSummary.tsx` — pasar `financialData` al llamar `exportEmployeePDF`


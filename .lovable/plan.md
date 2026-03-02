

# Analisis: "Historial del mes" en RosterExpandedRow

## Problema actual

El panel expandido muestra **todos los dias del mes** (con horario programado) en una tabla plana. En la imagen se ven ~30 filas, de las cuales **29 dicen "Pendiente"** con guiones en Entrada/Salida/Horas, y **solo 1 tiene datos reales** (01/03). Es ruido visual masivo.

### Por que pasa esto

Linea 132 del componente: solo omite dias sin schedule, sin entries Y sin requests. Pero como los horarios ya estan cargados para todo el mes, **cada dia futuro con turno programado genera una fila "Pendiente"** que no aporta nada.

### Funciones que SI cumple (cuando hay datos)
- Ver fichajes reales de dias pasados, expandir para ver foto/detalle
- Agregar fichaje manual en un dia especifico
- Editar/eliminar entries (delegando a EditEntryDialog)
- Ver total de horas del mes

### Funciones que NO cumple bien
- No distingue pasado de futuro visualmente
- Ocupa demasiado espacio con informacion vacia
- El total "Horas del mes" (linea 158) usa su propio calculo, no el de `useLaborHours` (misma redundancia que ya auditamos)

## Propuesta de mejora

**Filtrar dias futuros sin fichajes.** Solo mostrar:
1. Dias pasados con schedule o entries (historial real)
2. Dia de HOY (siempre, como referencia)
3. Dias futuros SOLO si tienen fichajes (caso raro pero posible)

Esto reduce la tabla de ~30 filas a solo las que importan (tipicamente 1-5 al inicio del mes).

Ademas:
- Marcar dias futuros restantes con un texto tipo "X dias programados restantes" colapsado, sin listarlos
- Mantener el total de horas solo de dias pasados con datos reales

### Cambios concretos

| Archivo | Cambio |
|---|---|
| `RosterExpandedRow.tsx` L96-149 | Filtrar `monthRows`: excluir dias futuros sin entries. Agregar linea resumen "X turnos programados pendientes" |
| `RosterExpandedRow.tsx` L151-158 | Sin cambio (el calculo ya solo suma lo que tiene sessions) |

Es un cambio pequeno (5-10 lineas de filtro) con alto impacto visual.


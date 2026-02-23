

# Agregar horario de hoy en las cards de /pedir

## Problema
Los cambios de horario se hicieron en `BranchLanding.tsx` (pagina individual del local), pero la pagina `/pedir` usa un componente `BranchCard` distinto dentro de `Pedir.tsx` que no muestra el horario de hoy.

## Cambio

### `src/pages/Pedir.tsx` - Componente `BranchCard`

Reutilizar las funciones `getTodayIdx`, `getTodayHours` y `formatTime` que ya existen en `BranchLanding.tsx` (o duplicarlas localmente ya que son funciones puras simples).

Agregar debajo del badge de estado (linea ~228) una linea con el horario de hoy extraido de `branch.public_hours`:

```
Manantiales          [Abierto]
Direccion...
Hoy: 11:30 - 00:00              <-- NUEVO
Servicios disponibles: Retiro, Delivery
```

- Si `public_hours` existe y tiene datos para hoy: mostrar "Hoy: HH:MM - HH:MM"
- Si hoy esta cerrado: mostrar "Hoy: Cerrado"
- Si no hay `public_hours`: no mostrar nada (igual que ahora)

Cambio puntual: agregar ~10 lineas despues del badge de estado y antes de la direccion, con un texto `text-xs text-muted-foreground` mostrando el horario.



# Plan: Corregir Scroll Containment en la Grilla de Horarios

## Problema Raíz

El scroll horizontal y vertical de la tabla de horarios "bleeds" (se escapa) al `body`, causando que toda la página se mueva en lugar de solo la tabla. Esto sucede porque:

1. **WorkShell no contiene overflow**: El layout usa `min-h-screen` pero no tiene `overflow-hidden`
2. **Cadena de containment rota**: Entre el componente `InlineScheduleEditor` y el root, hay múltiples contenedores sin restricción de altura
3. **Cálculo relativo incorrecto**: `max-h-[calc(100vh-320px)]` asume una altura conocida pero ignora los elementos acumulados (header, tabs, padding)

```
Actual (ROTO):
┌──────────────────────────────────────────┐
│ Body (scrollable)                        │ ← scroll se escapa aquí
│  ├─ WorkShell                            │
│  │   └─ main.p-6                         │
│  │       └─ SchedulesPage                │
│  │           └─ Tabs                     │
│  │               └─ InlineScheduleEditor │
│  │                   └─ overflow-auto    │ ← debería scrollear aquí
└──────────────────────────────────────────┘

Correcto (OBJETIVO):
┌──────────────────────────────────────────┐
│ Body (NO scroll / overflow-hidden)       │
│  ├─ WorkShell (h-screen, overflow-hidden)│
│  │   └─ main (flex-1, overflow-hidden)   │
│  │       └─ Content (flex-1, overflow-y) │
│  │           └─ Table (overflow-x-auto)  │ ← scroll horizontal aquí
└──────────────────────────────────────────┘
```

## Solución: Containment Correcto en Múltiples Capas

### 1. Modificar WorkShell.tsx

Agregar `h-screen overflow-hidden` al root y `overflow-auto` al main content para que TODO el scroll quede contenido.

**Antes:**
```tsx
<div className="min-h-screen bg-background">
  ...
  <main className="flex-1 lg:ml-72">
    <div className="p-6">{children}</div>
  </main>
</div>
```

**Después:**
```tsx
<div className="h-screen overflow-hidden bg-background flex flex-col">
  ...
  <div className="flex flex-1 overflow-hidden">
    {/* Sidebar */}
    <aside className="... h-full overflow-y-auto">...</aside>
    
    {/* Main - scroll interno */}
    <main className="flex-1 lg:ml-72 overflow-y-auto">
      <div className="p-6">{children}</div>
    </main>
  </div>
</div>
```

### 2. Modificar InlineScheduleEditor.tsx

Simplificar el contenedor de scroll ya que WorkShell ahora controla el overflow vertical:

**Antes:**
```tsx
<CardContent className="p-0 overflow-hidden">
  <div className="max-h-[calc(100vh-320px)] overflow-auto">
    ...
  </div>
</CardContent>
```

**Después:**
```tsx
<CardContent className="p-0">
  <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 380px)' }}>
    {/* Contenido con scroll interno */}
  </div>
</CardContent>
```

Alternativamente, usar un approach más robusto con CSS Grid:

```tsx
<CardContent className="p-0 overflow-hidden">
  <div className="overflow-x-auto overscroll-x-contain">
    {/* Scroll SOLO horizontal aquí */}
    <div className="max-h-[60vh] overflow-y-auto overscroll-y-contain">
      {/* Scroll SOLO vertical aquí */}
      <table>...</table>
    </div>
  </div>
</CardContent>
```

### 3. Agregar `overscroll-behavior: contain`

Esto previene que el scroll se propague al padre cuando llega al límite:

```tsx
<div className="overflow-auto overscroll-contain">
```

## Cambios Técnicos Específicos

### WorkShell.tsx

| Línea | Cambio |
|-------|--------|
| 46 | `min-h-screen` → `h-screen overflow-hidden flex flex-col` |
| 92 | Envolver sidebar + main en `<div className="flex flex-1 overflow-hidden">` |
| 122 | `main.flex-1` → agregar `overflow-y-auto` |

### InlineScheduleEditor.tsx

| Línea | Cambio |
|-------|--------|
| 788-790 | Simplificar contenedor de scroll, agregar `overscroll-contain` |
| 789 | Mantener `max-h` pero asegurar que el padre tenga `overflow-hidden` |

## Archivos a Modificar

| Archivo | Cambio Principal |
|---------|------------------|
| `src/components/layout/WorkShell.tsx` | Agregar containment con `h-screen overflow-hidden` |
| `src/components/hr/InlineScheduleEditor.tsx` | Agregar `overscroll-contain` y revisar `max-h` |

## Resultado Esperado

1. El scroll horizontal de la tabla queda contenido DENTRO de la grilla
2. El header, tabs y sidebar permanecen fijos mientras se scrollea
3. La columna "Empleado" permanece sticky a la izquierda
4. Los headers de días permanecen sticky arriba
5. No hay "scroll bleed" hacia el body

## Testing

Después de implementar, verificar:
- [ ] Scroll horizontal: solo mueve días, no el sidebar
- [ ] Scroll vertical: solo mueve filas, no el header de página
- [ ] Columna sticky: "Empleado" siempre visible a la izquierda
- [ ] Header sticky: días siempre visibles arriba
- [ ] Mobile: funciona igual en móvil

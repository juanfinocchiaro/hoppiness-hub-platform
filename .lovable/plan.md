
# Plan: Estandarizar UI de Mi Cuenta

## Problemas Detectados

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  INCONSISTENCIAS ACTUALES                                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Página          │ max-width  │ Header         │ Layout propio          │
│  ───────────────────────────────────────────────────────────────────────│
│  CuentaHome      │ max-w-4xl  │ div+h1 manual  │ No                     │
│  CuentaPerfil    │ SIN LIMITE │ PageHeader     │ No                     │
│  MiHorarioPage   │ max-w-4xl  │ PublicHeader   │ SI (duplicado!)        │
│  Resto (8 págs)  │ max-w-4xl  │ div+h1 manual  │ No                     │
│                                                                         │
│  RESULTADO: Diferentes anchos, headers inconsistentes, MiHorario        │
│  tiene un layout completo con PublicHeader dentro del WorkShell         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Solución: Estándar Unificado

Todas las páginas de Mi Cuenta deben seguir este patrón:

```tsx
// Estructura estándar para TODAS las páginas de Mi Cuenta
export default function MiXxxPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader 
        title="Título de Página" 
        subtitle="Descripción breve"
      />
      
      {/* Contenido específico */}
      <ComponenteCard />
    </div>
  );
}
```

### Reglas de Diseño

| Aspecto | Valor estándar |
|---------|----------------|
| Ancho máximo | `max-w-4xl` |
| Espaciado vertical | `space-y-6` |
| Header | Componente `PageHeader` |
| Contenido | Cards sin padding extra |

## Cambios por Página

### 1. CuentaHome.tsx
- Cambiar header manual por `PageHeader`
- Mantener `max-w-4xl`

### 2. CuentaPerfil.tsx
- AGREGAR `max-w-4xl` (falta actualmente)
- Ya usa `PageHeader` (bien)

### 3. MiHorarioPage.tsx (el más problemático)
- ELIMINAR `PublicHeader` (está dentro de WorkShell)
- ELIMINAR `<main className="container...">` wrapper
- Usar `PageHeader` con título/subtítulo
- Simplificar a contenido puro como las demás

### 4. MisFichajesPage.tsx
- Cambiar header manual por `PageHeader`

### 5. MisCoachingsPage.tsx
- Cambiar header manual por `PageHeader`

### 6. MisReunionesPage.tsx
- Cambiar header manual por `PageHeader`

### 7. MisSolicitudesPage.tsx
- Cambiar header manual por `PageHeader`

### 8. MisAdelantosPage.tsx
- Cambiar header manual por `PageHeader`

### 9. MisComunicadosPage.tsx
- Cambiar header manual por `PageHeader`

### 10. MiReglamentoPage.tsx
- Cambiar header manual por `PageHeader`

## Ejemplo Visual Final

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  ┌─ WorkShell ──────────────────────────────────────────────────────┐   │
│  │                                                                   │   │
│  │  [Sidebar]  │  ┌── max-w-4xl ────────────────────────────────┐   │   │
│  │  Mi Cuenta  │  │                                              │   │   │
│  │             │  │  ┌── PageHeader ─────────────────────────┐   │   │   │
│  │  ◉ Inicio   │  │  │  Mi Perfil                            │   │   │   │
│  │  ◯ Perfil   │  │  │  Información de tu cuenta             │   │   │   │
│  │  ◯ Comunic. │  │  └───────────────────────────────────────┘   │   │   │
│  │             │  │                                              │   │   │
│  │             │  │  ┌── Card: Datos personales ─────────────┐   │   │   │
│  │             │  │  │  [Avatar] Juan Finocchiaro            │   │   │   │
│  │             │  │  │  juan.finocchiaro@gmail.com           │   │   │   │
│  │             │  │  │  ─────────────────────────────────    │   │   │   │
│  │             │  │  │  Email, Nombre, Teléfono, Fecha       │   │   │   │
│  │             │  │  │  [Guardar cambios]                    │   │   │   │
│  │             │  │  └───────────────────────────────────────┘   │   │   │
│  │             │  │                                              │   │   │
│  │             │  │  ┌── Card: Seguridad ────────────────────┐   │   │   │
│  │             │  │  │  [Cambiar contraseña]                 │   │   │   │
│  │             │  │  └───────────────────────────────────────┘   │   │   │
│  │             │  │                                              │   │   │
│  │             │  └──────────────────────────────────────────────┘   │   │
│  │             │                                                     │   │
│  └─────────────┴─────────────────────────────────────────────────────┘   │
│                                                                         │
│  TODAS LAS PÁGINAS SIGUEN EL MISMO PATRÓN:                              │
│  - max-w-4xl                                                            │
│  - PageHeader con título y subtítulo                                    │
│  - Cards con contenido                                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Archivos a Modificar

| Archivo | Cambio Principal |
|---------|-----------------|
| `src/pages/cuenta/CuentaHome.tsx` | Usar PageHeader |
| `src/pages/cuenta/CuentaPerfil.tsx` | Agregar max-w-4xl |
| `src/pages/cuenta/MiHorarioPage.tsx` | Eliminar PublicHeader, simplificar layout |
| `src/pages/cuenta/MisFichajesPage.tsx` | Usar PageHeader |
| `src/pages/cuenta/MisCoachingsPage.tsx` | Usar PageHeader |
| `src/pages/cuenta/MisReunionesPage.tsx` | Usar PageHeader |
| `src/pages/cuenta/MisSolicitudesPage.tsx` | Usar PageHeader |
| `src/pages/cuenta/MisAdelantosPage.tsx` | Usar PageHeader |
| `src/pages/cuenta/MisComunicadosPage.tsx` | Usar PageHeader |
| `src/pages/cuenta/MiReglamentoPage.tsx` | Usar PageHeader |

## Resultado

- UI consistente en todas las páginas de Mi Cuenta
- Mismo ancho máximo (max-w-4xl)
- Headers unificados con PageHeader
- Sin layouts duplicados (PublicHeader eliminado de MiHorarioPage)
- Profesional y en sintonía con Mi Local y Mi Marca

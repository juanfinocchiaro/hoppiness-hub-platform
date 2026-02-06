
# Plan: Integrar Mi Perfil dentro del WorkShell de Mi Cuenta

## Problema Detectado

La página `/cuenta/perfil` tiene dos layouts superpuestos:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  ACTUALMENTE                                                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─ WorkShell (CuentaLayout) ───────────────────────────────────────┐   │
│  │                                                                   │   │
│  │  [Sidebar]  │  ┌─ PublicHeader ────────────────────────────┐     │   │
│  │  Mi Cuenta  │  │  HOPPINESS CLUB  |  Pedir  |  Nosotros    │     │   │
│  │             │  └───────────────────────────────────────────┘     │   │
│  │  ◉ Inicio   │                                                    │   │
│  │  ◯ Comunic. │      ← Mi Perfil                                   │   │
│  │             │      [Card: Datos personales]                      │   │
│  │  ────────── │      [Card: Seguridad]                             │   │
│  │  Mi Perfil  │                                                    │   │
│  │  Salir      │  ┌─ PublicFooter ────────────────────────────┐     │   │
│  │             │  │  Enlaces | Sumate | Seguinos               │     │   │
│  │             │  └───────────────────────────────────────────┘     │   │
│  └─────────────┴────────────────────────────────────────────────────┘   │
│                                                                         │
│  PROBLEMAS:                                                             │
│  1. Header público dentro del panel interno                             │
│  2. Footer público dentro del panel interno                             │
│  3. "Mi Perfil" redundante en sidebar footer                            │
│  4. UI inconsistente con otras páginas de Mi Cuenta                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Solución

Convertir `CuentaPerfil.tsx` en un componente de contenido puro (sin layout propio):

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  PROPUESTA                                                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─ WorkShell (CuentaLayout) ───────────────────────────────────────┐   │
│  │                                                                   │   │
│  │  [Sidebar]  │                                                    │   │
│  │  Mi Cuenta  │      Mi Perfil                                     │   │
│  │             │                                                    │   │
│  │  ◉ Inicio   │      ┌─────────────────────────────────────────┐   │   │
│  │  ◉ Perfil   │      │  [Avatar]  Juan Finocchiaro             │   │   │
│  │  ◯ Comunic. │      │           juan.finocchiaro@gmail.com    │   │   │
│  │             │      ├─────────────────────────────────────────┤   │   │
│  │  ────────── │      │  Email (no editable)                    │   │   │
│  │  Mi Local   │      │  Nombre completo                        │   │   │
│  │  Mi Marca   │      │  Teléfono                               │   │   │
│  │  ────────── │      │  Fecha de nacimiento                    │   │   │
│  │  Volver...  │      │  [Guardar cambios]                      │   │   │
│  │  Salir      │      └─────────────────────────────────────────┘   │   │
│  │             │                                                    │   │
│  │             │      ┌── Seguridad ────────────────────────────┐   │   │
│  │             │      │  [Cambiar contraseña]                   │   │   │
│  │             │      └─────────────────────────────────────────┘   │   │
│  │             │                                                    │   │
│  └─────────────┴────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Cambios Técnicos

### 1. Refactorizar CuentaPerfil.tsx

Eliminar:
- Import de `PublicHeader` y `PublicFooter`
- El wrapper `<div className="min-h-screen flex flex-col bg-muted/30">`
- La flecha "volver" (la navegación está en el sidebar)

Mantener:
- La lógica de datos (queries, mutations)
- Las cards de datos personales y seguridad
- El formulario de edición

### 2. Actualizar CuentaSidebar.tsx

Agregar "Mi Perfil" como ítem de navegación en el sidebar (no en el footer), ya que es una sección del panel igual que las demás.

### 3. Actualizar CuentaLayout.tsx

Remover "Mi Perfil" del footer (ya estará en el sidebar).

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/cuenta/CuentaPerfil.tsx` | Eliminar layout propio, simplificar a contenido puro |
| `src/components/layout/CuentaSidebar.tsx` | Agregar "Mi Perfil" como NavItemButton |
| `src/pages/cuenta/CuentaLayout.tsx` | Remover link a Mi Perfil del footer |

## Resultado

- **UI consistente**: Todas las páginas de Mi Cuenta usan el mismo WorkShell
- **Navegación clara**: Mi Perfil es un ítem más del sidebar
- **Sin redundancia**: Un solo lugar para acceder al perfil
- **Escalable**: Preparado para agregar más secciones de configuración personal



# Plan: Unificar Navegación entre Paneles

## El Problema Actual

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  FLUJO ACTUAL - DEMASIADOS CLICKS                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Mi Local → "Volver al Inicio" → Landing (/) → Click Header "Juan" →   │
│           → Dropdown → "Mi Cuenta" → /cuenta                            │
│                                                                         │
│  Total: 3+ clicks para ir de Mi Local a Mi Cuenta                       │
│                                                                         │
│  Y además: Layout completamente diferente (confuso)                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Solución Propuesta: Navegación Directa + Mi Cuenta con WorkShell

### Concepto Principal

1. **Mi Cuenta usa WorkShell** (mismo layout que Mi Local/Mi Marca)
2. **Footer simplificado** con cambio de contexto directo
3. **Un solo click** para cambiar entre paneles

### Nuevo Flujo de Navegación

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  FOOTER DE SIDEBARS - ZONA DE NAVEGACIÓN UNIFICADA                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ───────────────────────────                                            │
│  CAMBIAR A                                                              │
│  ───────────────────────────                                            │
│  [👤 Mi Cuenta]          ← Siempre visible                              │
│  [🏪 Mi Local: NVC]      ← Si tiene acceso local                        │
│  [🏢 Mi Marca]           ← Si tiene acceso marca                        │
│  ───────────────────────                                                │
│  [🚪 Cerrar sesión]                                                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Comportamiento por Panel

| Estás en | Footer muestra |
|----------|----------------|
| **Mi Cuenta** | [Mi Local] [Mi Marca] (si tiene acceso) |
| **Mi Local** | [Mi Cuenta] [Mi Marca] (si tiene acceso) |
| **Mi Marca** | [Mi Cuenta] [Mi Local] (si tiene acceso) |

El panel actual **no aparece en la lista** (ya estás ahí).

### Ejemplo Visual

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  ┌─ Mi Cuenta (WorkShell) ────────────────────────────────────────┐     │
│  │                                                                 │     │
│  │  [Logo]         │    Hola, Juan! 👋                             │     │
│  │  Mi Cuenta      │                                               │     │
│  │                 │    ┌───────────────────────────────────┐      │     │
│  │  ──────────     │    │ Próximo turno: Sábado 16:00       │      │     │
│  │  ◉ Inicio       │    │ Sucursal: Nueva Córdoba           │      │     │
│  │                 │    └───────────────────────────────────┘      │     │
│  │  ▸ Mi Trabajo   │                                               │     │
│  │    Horario      │    [Comunicados]  [Reuniones]                 │     │
│  │    Fichajes     │                                               │     │
│  │    Coachings    │    [Horarios] [Reglamento] [Adelantos]        │     │
│  │                 │                                               │     │
│  │  ◯ Comunicados  │                                               │     │
│  │  ◯ Reglamento   │                                               │     │
│  │                 │                                               │     │
│  │  ──────────     │                                               │     │
│  │  CAMBIAR A      │                                               │     │
│  │  ──────────     │                                               │     │
│  │  🏪 Mi Local    │  ← 1 click directo                            │     │
│  │  🏢 Mi Marca    │  ← 1 click directo                            │     │
│  │  ──────────     │                                               │     │
│  │  👤 Mi Perfil   │                                               │     │
│  │  🚪 Salir       │                                               │     │
│  │                 │                                               │     │
│  └─────────────────┴───────────────────────────────────────────────┘     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Consideración: Clientes Futuros

Para cuando Mi Cuenta incluya clientes (pedidos, etc.):

- **Staff**: Verán "Mi Trabajo" con horarios, fichajes, etc.
- **Clientes**: Verán "Mis Pedidos" con historial, favoritos, etc.

El sidebar se adapta según el tipo de usuario:

```text
SIDEBAR MI CUENTA - STAFF          SIDEBAR MI CUENTA - CLIENTE
─────────────────────────          ─────────────────────────────
◉ Inicio                           ◉ Inicio
                                   
▸ Mi Trabajo                       ▸ Mis Pedidos
  Horario                            Historial
  Fichajes                           Favoritos
  Coachings                          Direcciones
  Reuniones                        
                                   ▸ Puntos
◯ Comunicados                        Saldo
◯ Reglamento                         Canjear

──────────────                     ──────────────
👤 Mi Perfil                       👤 Mi Perfil
🚪 Salir                           🚪 Salir
```

## Cambios Técnicos

### 1. Crear CuentaLayout usando WorkShell

Archivo: `src/pages/cuenta/CuentaLayout.tsx`

```typescript
// Nuevo layout que usa WorkShell
export default function CuentaLayout() {
  return (
    <WorkShell
      mode="cuenta"
      title="Mi Cuenta"
      sidebar={<CuentaSidebar />}
      footer={<CuentaFooter />}
    >
      <Outlet />
    </WorkShell>
  );
}
```

### 2. Crear CuentaSidebar

Archivo: `src/components/layout/CuentaSidebar.tsx`

```typescript
export function CuentaSidebar() {
  return (
    <WorkSidebarNav>
      <NavDashboardLink to="/cuenta" icon={Home} label="Inicio" />
      
      {/* Solo para staff (no clientes) */}
      {isStaff && (
        <NavSectionGroup id="trabajo" label="Mi Trabajo" icon={Briefcase}>
          <NavItemButton to="/cuenta/horario" icon={Calendar} label="Horario" />
          <NavItemButton to="/cuenta/fichajes" icon={Clock} label="Fichajes" />
          <NavItemButton to="/cuenta/coachings" icon={ClipboardList} label="Coachings" />
          <NavItemButton to="/cuenta/reuniones" icon={Users} label="Reuniones" />
        </NavSectionGroup>
      )}
      
      <NavItemButton to="/cuenta/comunicados" icon={MessageSquare} label="Comunicados" />
      <NavItemButton to="/cuenta/reglamento" icon={FileCheck} label="Reglamento" />
    </WorkSidebarNav>
  );
}
```

### 3. Modificar WorkShell para soportar modo "cuenta"

Archivo: `src/components/layout/WorkShell.tsx`

```typescript
interface WorkShellProps {
  mode: 'brand' | 'local' | 'cuenta';  // Agregar "cuenta"
  // ...
}

const panelLabel = 
  mode === 'brand' ? 'Mi Marca' : 
  mode === 'local' ? 'Mi Local' : 
  'Mi Cuenta';
```

### 4. Unificar Footer de Navegación

Crear componente reutilizable para el footer:

Archivo: `src/components/layout/PanelSwitcher.tsx`

```typescript
// Componente que muestra links a otros paneles
export function PanelSwitcher({ currentPanel }: { currentPanel: 'cuenta' | 'local' | 'marca' }) {
  const { canAccessLocal, canAccessAdmin, accessibleBranches } = useRoleLandingV2();
  
  return (
    <div className="space-y-1">
      <div className="text-xs uppercase text-muted-foreground font-medium px-3 py-2">
        Cambiar a
      </div>
      
      {currentPanel !== 'cuenta' && (
        <Link to="/cuenta">
          <Button variant="ghost" className="w-full justify-start">
            <User className="w-4 h-4 mr-3" />
            Mi Cuenta
          </Button>
        </Link>
      )}
      
      {currentPanel !== 'local' && canAccessLocal && (
        <Link to={`/milocal/${accessibleBranches[0]?.id}`}>
          <Button variant="ghost" className="w-full justify-start">
            <Store className="w-4 h-4 mr-3" />
            Mi Local
          </Button>
        </Link>
      )}
      
      {currentPanel !== 'marca' && canAccessAdmin && (
        <Link to="/mimarca">
          <Button variant="ghost" className="w-full justify-start">
            <Building2 className="w-4 h-4 mr-3" />
            Mi Marca
          </Button>
        </Link>
      )}
    </div>
  );
}
```

### 5. Actualizar Rutas en App.tsx

```typescript
// Nueva estructura de rutas para Mi Cuenta
<Route path="/cuenta" element={<RequireAuth><CuentaLayout /></RequireAuth>}>
  <Route index element={<CuentaHome />} />
  <Route path="perfil" element={<CuentaPerfil />} />
  <Route path="horario" element={<MiHorarioPage />} />
  <Route path="fichajes" element={<MisFichajesPage />} />
  <Route path="coachings" element={<MisCoachingsPage />} />
  <Route path="reuniones" element={<MisReunionesPage />} />
  <Route path="comunicados" element={<MisComunicadosPage />} />
  <Route path="reglamento" element={<MiReglamentoPage />} />
</Route>
```

## Archivos a Crear

| Archivo | Descripción |
|---------|-------------|
| `src/pages/cuenta/CuentaLayout.tsx` | Layout principal con WorkShell |
| `src/components/layout/CuentaSidebar.tsx` | Sidebar de Mi Cuenta |
| `src/components/layout/PanelSwitcher.tsx` | Componente reutilizable para cambio de panel |
| `src/pages/cuenta/CuentaHome.tsx` | Dashboard simplificado (resumen) |
| `src/pages/cuenta/MisFichajesPage.tsx` | Página de fichajes |
| `src/pages/cuenta/MisCoachingsPage.tsx` | Página de coachings |
| `src/pages/cuenta/MisReunionesPage.tsx` | Página de reuniones |
| `src/pages/cuenta/MisComunicadosPage.tsx` | Página de comunicados |
| `src/pages/cuenta/MiReglamentoPage.tsx` | Página de reglamento |
| `src/pages/cuenta/MisAdelantosPage.tsx` | Página de adelantos |
| `src/pages/cuenta/MisSolicitudesPage.tsx` | Página de solicitudes |

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/layout/WorkShell.tsx` | Agregar modo "cuenta" |
| `src/pages/local/BranchLayout.tsx` | Usar PanelSwitcher en footer |
| `src/pages/admin/BrandLayout.tsx` | Usar PanelSwitcher en footer |
| `src/App.tsx` | Actualizar rutas de /cuenta |

## Resultado Final

**Antes**: 3+ clicks para cambiar de panel + layout confuso
**Después**: 1 click + layout consistente

Los tres paneles (Mi Cuenta, Mi Local, Mi Marca) comparten:
- Mismo WorkShell (estructura visual)
- Mismo pattern de sidebar
- Navegación directa entre paneles en el footer
- Soporte futuro para clientes en Mi Cuenta


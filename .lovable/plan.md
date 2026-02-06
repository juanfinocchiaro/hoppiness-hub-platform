

# Plan: Completar Integración de Reuniones en Mi Marca

## Lo que falta implementar

Según el documento de especificación, la sección **5.3 Mi Marca (Vista Red)** requiere:

| Requisito | Estado |
|-----------|--------|
| Item "Reuniones" en sidebar de Comunicación | Falta |
| Vista consolidada de todas las reuniones | Falta |
| Filtros por sucursal, fecha y área | Falta |
| Métricas: total mes, % lectura, alertas | Falta |
| Card resumen en Dashboard de Mi Marca | Falta |

---

## Cambios a Realizar

### 1. Agregar Item en BrandSidebar

En `src/components/layout/BrandSidebar.tsx`, dentro de la sección "Comunicación":

```tsx
// Sección Comunicación - agregar "Reuniones"
<NavSectionGroup id="comunicacion" label="Comunicación" icon={Megaphone}>
  <NavItemButton to="/mimarca/mensajes" icon={MessageSquare} label="Bandeja de Entrada" />
  <NavItemButton to="/mimarca/comunicados" icon={Megaphone} label="Comunicados" />
  <NavItemButton to="/mimarca/reuniones" icon={Calendar} label="Reuniones" /> {/* NUEVO */}
</NavSectionGroup>
```

### 2. Crear Página BrandMeetingsPage

Nueva página `src/pages/admin/BrandMeetingsPage.tsx` con:

- Vista consolidada de reuniones de todas las sucursales
- Filtros por sucursal, área y fecha
- Métricas en header:
  - Total de reuniones del mes
  - % de lectura confirmada por sucursal
  - Alertas de reuniones con pendientes

### 3. Agregar Hook para Reuniones de Marca

En `src/hooks/useMeetings.ts`, agregar:

```typescript
// Hook para obtener TODAS las reuniones de la red
export function useBrandMeetings() {
  return useQuery({
    queryKey: ['brand-meetings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('meetings')
        .select(`
          *,
          branches(id, name, slug),
          participants:meeting_participants(id, user_id, attended, read_at)
        `)
        .order('date', { ascending: false });
      
      return data || [];
    },
  });
}

// Hook para métricas consolidadas
export function useBrandMeetingsStats() {
  return useQuery({
    queryKey: ['brand-meetings-stats'],
    queryFn: async () => {
      // Reuniones del mes actual
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { data: meetings } = await supabase
        .from('meetings')
        .select(`
          id,
          branch_id,
          branches(name),
          participants:meeting_participants(id, read_at)
        `)
        .gte('date', startOfMonth.toISOString());
      
      // Calcular métricas por sucursal
      // ...
      return { totalMeetings, readPercentage, pendingByBranch };
    },
  });
}
```

### 4. Agregar Ruta en App.tsx

```tsx
// Dentro de /mimarca
<Route path="reuniones" element={<BrandMeetingsPage />} />
```

### 5. Opcional: Card en Dashboard de Mi Marca

Si se desea, agregar card resumen en `src/pages/admin/BrandHome.tsx`:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Reuniones de la Red</CardTitle>
  </CardHeader>
  <CardContent>
    <p>12 reuniones este mes</p>
    <p className="text-amber-600">3 sucursales con pendientes de lectura</p>
    <Button asChild>
      <Link to="/mimarca/reuniones">Ver reuniones</Link>
    </Button>
  </CardContent>
</Card>
```

---

## Diseño de la Vista Consolidada

```text
┌─────────────────────────────────────────────────────────────────┐
│ Reuniones de la Red                            [+ Nueva Reunión]│
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────────┐ │
│ │ 12          │ │ 87%         │ │ 3 alertas                   │ │
│ │ reuniones   │ │ lectura     │ │ pendientes de lectura       │ │
│ │ este mes    │ │ confirmada  │ │                             │ │
│ └─────────────┘ └─────────────┘ └─────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ Filtros: [Todas las sucursales ▼] [Todas las áreas ▼] [Febrero]│
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🏪 General Paz • Cocina • 5 feb                             │ │
│ │ Reunión de apertura de turno                                │ │
│ │ 4/5 presentes • 3/5 confirmaron lectura                     │ │
│ │ ⚠️ 2 pendientes                                      [Ver →]│ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🏪 Nueva Córdoba • General • 3 feb                          │ │
│ │ Cambio de proveedores                                       │ │
│ │ 6/6 presentes • 6/6 confirmaron lectura                     │ │
│ │ ✓ Todos leyeron                                      [Ver →]│ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Archivos a Crear

| Archivo | Descripción |
|---------|-------------|
| `src/pages/admin/BrandMeetingsPage.tsx` | Página principal con lista, filtros y métricas |

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/layout/BrandSidebar.tsx` | Agregar item "Reuniones" en sección Comunicación |
| `src/hooks/useMeetings.ts` | Agregar hooks para reuniones de marca |
| `src/App.tsx` | Agregar ruta `/mimarca/reuniones` |
| `src/pages/admin/BrandHome.tsx` | (Opcional) Agregar card resumen de reuniones |

---

## Permisos

Los hooks de reuniones de marca solo deben ser accesibles para usuarios con `brand_role`:

| Rol | Ver reuniones de marca | Crear reuniones |
|-----|------------------------|-----------------|
| Superadmin | ✅ Todas | ✅ |
| Coordinador | ✅ Todas | ✅ |
| Franquiciado | ❌ Solo Mi Local | ❌ |


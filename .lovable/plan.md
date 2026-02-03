
# Plan: Corregir Contador de Empleados en TeamPage

## Problema Identificado

En la página "Mi Equipo" (`/milocal/:branchId/equipo`), el subtítulo dice "5 empleados" pero incluye a los 3 franquiciados (propietarios) en el conteo. Esto es incorrecto porque:

1. Los franquiciados **no son empleados** - son dueños del local
2. La tabla ya los separa visualmente en una sección "Propietarios del Local"
3. El contador debería reflejar solo el personal operativo

---

## Solución

Modificar `TeamPage.tsx` para que el contador excluya a los franquiciados.

### Archivo a Modificar
`src/pages/local/TeamPage.tsx`

### Cambio Específico

```tsx
// ANTES (línea 49-51):
<p className="text-sm text-muted-foreground">
  {filteredTeam.length} empleado{filteredTeam.length !== 1 ? 's' : ''}
</p>

// DESPUÉS:
// Separar franquiciados de empleados para el contador
const employees = filteredTeam.filter(m => m.local_role !== 'franquiciado');
const franchisees = filteredTeam.filter(m => m.local_role === 'franquiciado');

<p className="text-sm text-muted-foreground">
  {employees.length} empleado{employees.length !== 1 ? 's' : ''}
  {franchisees.length > 0 && ` · ${franchisees.length} propietario${franchisees.length !== 1 ? 's' : ''}`}
</p>
```

---

## Resultado Esperado

### Antes (incorrecto)
```text
Mi Equipo
5 empleados
```

### Después (correcto)
```text
Mi Equipo
2 empleados · 3 propietarios
```

O si no hay franquiciados en el local filtrado:
```text
Mi Equipo
2 empleados
```

---

## Resumen

| Aspecto | Cambio |
|---------|--------|
| Contador principal | Solo cuenta roles operativos (encargado, cajero, empleado) |
| Indicador adicional | Muestra propietarios separados si existen |
| Lógica reutilizada | Misma lógica que usa `TeamTable.tsx` internamente |

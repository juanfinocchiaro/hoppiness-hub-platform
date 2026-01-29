
# Plan: Corregir navegación entre sucursales

## Problema Identificado

Cuando navegas entre sucursales en el sidebar de "Mi Marca", el panel de edición de la derecha no se actualiza correctamente. Solo cambia el título del header, pero el formulario mantiene los datos de la sucursal anterior.

**Causa técnica**: El componente `BranchEditPanel` inicializa todos sus campos con `useState` basándose en el prop `branch`:

```javascript
const [name, setName] = useState(branch.name || '');
const [address, setAddress] = useState(branch.address || '');
// etc...
```

Los `useState` solo establecen el valor inicial en el **primer render**. Cuando la URL cambia de `/mimarca/locales/villa-allende` a `/mimarca/locales/villa-carlos-paz`, React reutiliza el mismo componente y los estados mantienen los valores anteriores.

## Solución

Agregar un atributo `key` al componente `BranchEditPanel` usando el `branch.id`. Esto le indica a React que son componentes diferentes y debe desmontar/remontar cuando cambia la sucursal.

## Cambios

### 1. `src/pages/admin/BranchDetail.tsx`

Modificar la línea donde se renderiza el panel de edición:

```jsx
// Antes:
<BranchEditPanel 
  branch={branch} 
  onSaved={refetch} 
  onCancel={() => navigate('/mimarca')}
/>

// Después:
<BranchEditPanel 
  key={branch.id}  // ← Fuerza remount cuando cambia la sucursal
  branch={branch} 
  onSaved={refetch} 
  onCancel={() => navigate('/mimarca')}
/>
```

## Resultado Esperado

- Al navegar de Villa Allende → Villa Carlos Paz → Villa Allende, el formulario mostrará los datos correctos de cada sucursal
- Los horarios públicos también se actualizarán correctamente (el `PublicHoursEditor` ya tiene un `useEffect` para sincronizar, pero igual se beneficia del remount)

---

**Cambio mínimo**: 1 línea modificada en 1 archivo.

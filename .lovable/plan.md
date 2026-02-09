

# Eliminar Validación de 7+ Días Consecutivos

## Problema
La regla de validación laboral (Ley 11.544) está bloqueando el guardado de horarios cuando un empleado tiene 7+ días consecutivos sin franco. Esto impide programar horarios flexibles según las necesidades operativas.

## Solución
Eliminar completamente la validación y los elementos de UI relacionados.

## Cambios en `src/components/hr/InlineScheduleEditor.tsx`

### 1. Eliminar el cálculo de violaciones (líneas ~596-645)
Remover el `useMemo` de `consecutiveDaysViolations`

### 2. Eliminar la variable de control (línea ~647)
Remover `const hasLaborViolations = consecutiveDaysViolations.length > 0;`

### 3. Habilitar el botón de guardar (línea ~1032)
Cambiar:
```tsx
disabled={hasLaborViolations}
```
Por:
```tsx
disabled={false}
```
O simplemente remover la prop `disabled` y el `title`.

### 4. Eliminar el banner de advertencia (líneas ~1335-1343)
Remover el bloque completo del Card de advertencia:
```tsx
{hasLaborViolations && (
  <Card className="border-destructive bg-destructive/10">
    ...
  </Card>
)}
```

## Resultado
- El botón "Guardar" funcionará siempre
- No se mostrará ningún warning de días consecutivos
- Los encargados tendrán libertad total para programar horarios


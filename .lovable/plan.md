

## Corregir demora en descubrimiento de Extras y Removibles tras cambio de composicion

### Causa
Cuando guardas la composicion de un item, la mutacion `saveComposicion` en `useItemsCarta.ts` solo invalida dos queries en su `onSuccess`:
- `item-carta-composicion` (la composicion directa)
- `items-carta` (la lista general)

Pero **no invalida** `item-ingredientes-deep`, que es la query que hace la exploracion recursiva de ingredientes. Esa query es la que alimenta tanto "Extras Disponibles" como "Removibles". Al no invalidarla, React Query usa los datos cacheados hasta que el refetch automatico ocurra en segundo plano, lo cual puede tardar varios segundos.

### Solucion

**Archivo: `src/hooks/useItemsCarta.ts`** (linea ~148-151)

Agregar la invalidacion de `item-ingredientes-deep` en el `onSuccess` de `saveComposicion`:

```typescript
onSuccess: (_, vars) => {
  qc.invalidateQueries({ queryKey: ['item-carta-composicion', vars.item_carta_id] });
  qc.invalidateQueries({ queryKey: ['item-ingredientes-deep', vars.item_carta_id] });
  qc.invalidateQueries({ queryKey: ['items-carta'] });
  toast.success('Composición guardada');
},
```

Con este unico cambio, al guardar la composicion, el descubrimiento profundo se re-ejecuta inmediatamente y los extras y removibles aparecen al instante.




## Fix: Reuniones muestra "18 sin leer" contando reuniones canceladas

### Problema

La card de Reuniones en el dashboard de Manantiales muestra **"18 sin leer"** porque esta sumando los participantes sin leer de **todas** las reuniones, incluyendo las **canceladas**.

Datos actuales:
- "NOVEDADES" (convocada): 9 participantes sin leer
- "REUNION PERSONAL NOVEDADES" (**cancelada**): 9 participantes sin leer
- Total mostrado: 18 -- pero la reunion cancelada no deberia contar

### Solucion

Filtrar las reuniones canceladas del calculo de `pendingReads` en `MeetingPendingCard.tsx`.

### Cambio tecnico

**Archivo:** `src/components/meetings/MeetingPendingCard.tsx`

Linea 27-30, cambiar:

```typescript
// Antes (cuenta TODAS las reuniones)
const pendingReads = meetings?.reduce((acc, m) => {
  const unread = m.participants?.filter((p: any) => !p.read_at).length || 0;
  return acc + unread;
}, 0) || 0;

// Despues (excluye canceladas)
const pendingReads = meetings
  ?.filter(m => m.status !== 'cancelada')
  .reduce((acc, m) => {
    const unread = m.participants?.filter((p: any) => !p.read_at).length || 0;
    return acc + unread;
  }, 0) || 0;
```

Tambien se filtrara `lastMeeting` para que no muestre una reunion cancelada como "ultima reunion".

Solo se modifica 1 archivo, sin cambios de backend.


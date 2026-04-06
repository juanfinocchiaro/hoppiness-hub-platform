

## Limpieza de fichajes duplicados/huérfanos de Leonardo (29/03)

### Problema
Al cargar fichajes manuales con el bug de UTC (ya corregido), quedaron 3 registros basura en `clock_entries` para Leonardo en `work_date = 2026-03-29`:

1. **`edaee3dd...`** — clock_in a las 00:00 UTC (21:00 ART del 28) — creado por el bug de timezone
2. **`7744262d...`** — clock_in a las 00:00 UTC — duplicado del anterior
3. **`08b04feb...`** — clock_out a las 23:58 UTC del 30/03 — huérfano sin clock_in asociado

### Solución
Crear una migración SQL que elimine estos 3 registros específicos por ID:

```sql
DELETE FROM clock_entries
WHERE id IN (
  'edaee3dd-ec6a-4d32-803a-b48d39505e25',
  '7744262d-1182-4ee1-a98f-876e5448eea0',
  '08b04feb-12d7-4eae-b0fb-3977f6c9ef2b'
);
```

### Resultado
Quedarán solo los 4 fichajes correctos del 29/03:
- 11:53 → 16:03 (turno mañana, 4.17h)
- 20:56 → 00:55 (turno noche, 3.98h)

### Archivos a modificar
- Ninguno — solo una migración de base de datos




## Fix: Health check de impresoras falla aunque Print Bridge funcione

### Problema

En `src/lib/qz-print.ts`, la funcion `testPrinterConnection` tiene este flujo:

1. Llama a `detectQZ()` (fetch a `/status`)
2. Si `/status` falla -> devuelve `{ reachable: false, error: 'QZ_NOT_AVAILABLE' }` SIN intentar el test
3. Si `/status` funciona -> llama a `/test` con la IP de la impresora

Pero `printRawBase64` (la que imprime de verdad) va directo a `/print` sin pre-verificar `/status`. Por eso:
- **Test de impresion** (boton Test) -> funciona, porque usa `printRawBase64` -> `/print`
- **Health check** (indicador de estado) -> falla, porque `testPrinterConnection` primero pasa por `detectQZ()` -> `/status` que puede fallar por timing o cache

### Solucion

**Archivo: `src/lib/qz-print.ts`** - Funcion `testPrinterConnection` (lineas ~88-107)

Eliminar la pre-verificacion de `detectQZ()` y llamar directamente al endpoint `/test`. Si `/test` falla por network error, devolver `{ reachable: false }` con un mensaje util. Esto hace que el health check se comporte igual que la impresion real: ir directo al bridge sin gatekeeping.

Cambiar de:
```typescript
const bridge = await detectQZ();
if (!bridge.available) {
  return { reachable: false, error: 'QZ_NOT_AVAILABLE' };
}
const res = await fetch(`${PRINT_BRIDGE_URL}/test`, ...);
```

A:
```typescript
const res = await fetch(`${PRINT_BRIDGE_URL}/test`, ...);
return await res.json();
```

El catch ya maneja el caso de que el bridge no este corriendo.


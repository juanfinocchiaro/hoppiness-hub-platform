

## Fix: Cambiar 127.0.0.1 por localhost en qz-print.ts

### Problema
El navegador bloquea las peticiones HTTP desde un sitio HTTPS (mixed content). Chrome tiene una excepcion especial para `http://localhost` pero NO para `http://127.0.0.1`. Por eso el fetch siempre falla con "Failed to fetch" aunque Print Bridge este corriendo.

### Solucion

**Archivo: `src/lib/qz-print.ts`** - Linea 9

Cambiar:
```
const PRINT_BRIDGE_URL = 'http://127.0.0.1:3001';
```

Por:
```
const PRINT_BRIDGE_URL = 'http://localhost:3001';
```

Eso es todo. Un cambio de una linea. Print Bridge ya escucha en `127.0.0.1` que es lo mismo que `localhost`, pero el navegador los trata distinto para mixed content.

### Tambien en el .bat

El servidor en `print-bridge.js` (embebido en el .bat) escucha en `127.0.0.1:3001`. Esto esta bien, no hay que cambiarlo - `localhost` resuelve a `127.0.0.1` automaticamente. Solo hay que cambiar la URL del lado del frontend.




## Agregar boton "Ya lo tengo instalado" a la pantalla de impresoras

### Problema
La deteccion de Print Bridge funciona correctamente (fetch a `http://127.0.0.1:3001/status`), pero desde el preview de Lovable la llamada siempre falla porque el preview corre en un servidor remoto, no en la PC local donde esta Print Bridge. Esto deja la pantalla trabada en "Esperando instalacion..." aunque el bridge este corriendo.

### Solucion

Modificar un solo archivo: `src/pages/local/PrintersConfigPage.tsx`

1. Agregar un boton "Ya lo tengo instalado" en el `SetupScreen` (debajo de "Esperando instalacion...") que llame a `onSkip` para forzar `systemState = 'ready'`
2. Agregar un banner de advertencia en `ReadyScreen` cuando el bridge no esta disponible, indicando que se puede configurar pero no imprimir hasta que se acceda desde la PC correcta
3. Mantener el polling en background para que si el bridge aparece, el banner desaparezca automaticamente

### Detalle tecnico

**SetupScreen**: recibe nueva prop `onSkip: () => void`. Muestra boton `variant="ghost"` con texto "Ya lo tengo instalado" debajo del estado `not_available`.

**PrintersConfigPage (main)**:
- Nuevo estado `bridgeAvailable: boolean` que se actualiza con cada ciclo de polling (independiente de `systemState`)
- Pasa `onSkip={() => setSystemState('ready')}` al SetupScreen
- Pasa `bridgeAvailable` al ReadyScreen
- El polling sigue corriendo siempre (no solo cuando `systemState !== 'ready'`) para mantener `bridgeAvailable` actualizado

**ReadyScreen**: recibe nueva prop `bridgeAvailable: boolean`. Si es false, muestra un banner amarillo: "Sistema de impresion no detectado en esta PC. Podes configurar impresoras pero no vas a poder imprimir hasta que Print Bridge este corriendo."


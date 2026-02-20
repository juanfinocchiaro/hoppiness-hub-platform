

## Fix: Impresora "No responde" y boton de Test siempre visible

### Problema actual

1. El boton "Test" (imprimir pagina de prueba) solo aparece cuando el health check dice "Conectada". Si dice "No responde", no hay forma de intentar imprimir.
2. El health check envia un comando ESC/POS minimo via QZ Tray al puerto 9100. Si QZ Tray tiene algun problema transitorio con esa conexion TCP, marca "No responde" aunque la impresora este fisicamente ok.
3. No se muestra el error especifico del health check, lo que dificulta diagnosticar.

### Solucion

**Mostrar el boton "Test" siempre**, independientemente del estado del health check. Si la impresora dice "No responde", el usuario igual puede intentar imprimir una pagina de prueba. Si la impresion funciona, queda claro que el health check tuvo un falso negativo.

Ademas, mostrar el mensaje de error real del health check para ayudar a diagnosticar.

### Cambios tecnicos

**`src/pages/local/PrintersConfigPage.tsx`**

En el componente `PrinterCard`:

- Mover el boton "Test" fuera de las condiciones de estado. Siempre visible junto a "Editar" y "Eliminar".
- El boton "Reintentar" sigue apareciendo solo cuando el estado es "unreachable".
- En `HealthIndicator`, cuando el estado es "unreachable", mostrar el error tecnico en un tooltip o texto secundario (ej: "No responde - TIMEOUT" o "No responde - QZ_NOT_AVAILABLE").

Cambio en la seccion de botones del PrinterCard (lineas 278-305):

```text
Antes:
  - unreachable: solo Reintentar
  - reachable: solo Test
  - idle: solo Test

Despues:
  - unreachable: Reintentar + Test
  - reachable: Test
  - idle: Test
  (Test siempre visible)
```

En `HealthIndicator` (lineas 225-231), agregar el error como texto secundario:

```text
Antes:  "No responde"
Despues: "No responde" + tooltip/texto con health.error si existe
```


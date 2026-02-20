

## Impresion directa sin dialogo via QZ Tray

### Que se va a hacer

Reemplazar el sistema actual de impresion (que usa una Edge Function en la nube y no puede llegar a IPs privadas) por impresion directa usando QZ Tray como puente local. La app se comunica con QZ Tray via WebSocket en localhost, y QZ Tray envia los bytes ESC/POS directo a la impresora por TCP. Sin dialogo, sin delay.

### Flujo

```text
Navegador (Hoppiness Hub)
    |
    | WebSocket a localhost:8182
    v
QZ Tray (programa en la PC)
    |
    | TCP directo a 192.168.x.x:9100
    v
Impresora termica
```

### Primera vez en una PC

1. El usuario va a Configuracion > Impresoras
2. La app detecta que el sistema de impresion no esta instalado
3. Muestra pantalla simple: "Descarga e instala esto (doble clic)"
4. El usuario descarga un `.bat`, le da doble clic, se instala solo
5. La pagina detecta automaticamente que ya esta listo (polling cada 3 seg)
6. Aparece la config de impresoras, pone IP y puerto, hace Test, y sale imprimiendo

### Uso diario

1. QZ Tray arranca con Windows
2. El indicador en el sidebar muestra impresora en verde
3. Cada ticket/comanda se imprime directo, sin dialogo

### Cambios tecnicos

**1. Instalar dependencia npm: `qz-tray`**

**2. Crear: `src/lib/qz-print.ts`**

Modulo que maneja la conexion WebSocket con QZ Tray:
- `connectQZ()` - Conecta al WebSocket local
- `printRaw(ip, port, data)` - Envia bytes ESC/POS a la impresora via TCP
- `detectQZ()` - Detecta si QZ Tray esta corriendo (retorna available, version, error)
- `isQZConnected()` - Estado actual de conexion
- `disconnectQZ()` - Desconecta
- Configuracion sin certificado digital (uso en red local)
- Reconexion automatica si se pierde la conexion

**3. Modificar: `src/hooks/usePrinting.ts`**

- Reemplazar la llamada a la Edge Function `print-to-network` por `printRaw()` del nuevo modulo
- Mantener la misma API publica (printTest, printComandaCompleta, etc.)
- Agregar estado exportado `qzStatus` ('checking' | 'connected' | 'not_available')
- Deteccion al montar el hook
- Si QZ no esta disponible, toast con instrucciones (sin mencionar "QZ Tray" por nombre)

**4. Redisenar: `src/pages/local/PrintersConfigPage.tsx`**

La pagina tiene 2 estados con transicion automatica:

**Estado 1 - Sistema no detectado:**
- Pantalla limpia explicando que hay que instalar un programa (una sola vez)
- Boton "Descargar instalador" que baja el `.bat`
- Animacion de "Esperando instalacion..." con polling cada 3 seg
- Seccion de solucion de problemas en acordeon (Windows SmartScreen, antivirus, etc.)
- Sub-estado si detecta QZ instalado pero sin permiso: mensaje para aceptar el popup

**Estado 2 - Sistema listo:**
- Badge verde "Sistema de impresion listo"
- Cards de impresoras con IP, Puerto, Tipo, Ancho de papel
- Boton Test que imprime directo (resultado inline: ok o error)
- Boton Agregar impresora
- Seccion de ayuda expandible (como encontrar la IP, que puerto usar)
- Transicion animada desde Estado 1 (fade con pausa de 1.5s)

**5. Crear: `public/instalar-impresoras.bat`**

Archivo `.bat` descargable que instala QZ Tray automaticamente con un doble clic. Usa PowerShell para descargar e instalar.

**6. Indicador de estado en el sidebar de Mi Local**

- Icono de impresora con punto verde (conectado) o rojo (no disponible)
- Tooltip descriptivo
- Clic navega a la pagina de impresoras
- Solo verifica una vez al cargar (no polling continuo)

### Lo que NO cambia

- `src/lib/escpos.ts` - Todo el codigo ESC/POS se mantiene tal cual
- Tabla `branch_printers` - Ya tiene `ip_address` y `port`, no hay migracion
- Edge Function `print-to-network` - Se mantiene sin uso activo
- Tabla `print_jobs` - Se mantiene para historial

### Reglas de UX

- Nunca mostrar "QZ Tray" en la UI. Siempre decir "sistema de impresion"
- Todos los mensajes de error en espanol y orientados a la accion
- La transicion entre Estado 1 y 2 es automatica y animada


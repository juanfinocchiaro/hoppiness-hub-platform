

## Reemplazo de QZ Tray por Print Bridge

Eliminar toda la dependencia de QZ Tray (WebSocket + certificados + Java) y reemplazarla por un microservicio HTTP propio ("Print Bridge") que corre en localhost:3001. Cero popups, cero dependencias npm extra, cero Java.

### Archivos a modificar/crear/eliminar

| Archivo | Accion |
|---------|--------|
| `print-bridge/server.js` | CREAR - Servidor Node.js (referencia, no se ejecuta en Lovable) |
| `src/lib/qz-print.ts` | REEMPLAZAR completamente - Cliente HTTP fetch() simple (~80 lineas) |
| `src/lib/qz-certificate.ts` | ELIMINAR |
| `src/hooks/usePrinting.ts` | MODIFICAR - `detectPrintBridge` en vez de `detectQZ`, eliminar import de qz-certificate |
| `src/pages/local/PrintersConfigPage.tsx` | MODIFICAR - `detectPrintBridge` en vez de `detectQZ`, actualizar textos de ayuda (ya no mencionar QZ Tray) |
| `src/components/local/PrinterStatusDot.tsx` | MODIFICAR - `detectPrintBridge` en vez de `detectQZ` |
| `public/instalar-impresoras.bat` | REEMPLAZAR - Instala Print Bridge en vez de QZ Tray |

### Dependencias npm a eliminar

- `qz-tray`
- `node-forge`
- `@types/node-forge`

No se agrega ninguna dependencia nueva. El cliente usa `fetch()` nativo.

### Detalle tecnico

**`src/lib/qz-print.ts` (reemplazo completo)**

Pasa de ~170 lineas con WebSocket + certificados a ~80 lineas con fetch() HTTP simple:

- `detectPrintBridge()` reemplaza `detectQZ()` - hace GET a `localhost:3001/status`
- `printRaw()` y `printRawBase64()` hacen POST a `localhost:3001/print` con `{ ip, port, data }`
- `testPrinterConnection()` hace POST a `localhost:3001/test` con `{ ip, port }`
- `getNetworkFingerprint()` queda igual (no depende de QZ)
- Se eliminan: `connectQZ()`, `disconnectQZ()`, `isQZConnected()`, `setupQZ()`, todo el cache de deteccion

Las funciones exportadas mantienen la misma firma publica, asi que los consumidores (`usePrinting`, `PrintersConfigPage`, `PrinterStatusDot`) solo cambian el nombre del import `detectQZ` a `detectPrintBridge`.

**`src/hooks/usePrinting.ts`**

- Import: `detectPrintBridge` en vez de `detectQZ`
- Eliminar import de qz-certificate
- El tipo `QZStatus` se renombra a `PrintBridgeStatus` internamente pero la API del hook no cambia

**`PrintersConfigPage.tsx`**

- Import: `detectPrintBridge` en vez de `detectQZ`
- Textos de ayuda: "QZ Tray" pasa a "sistema de impresion" o "Print Bridge"
- El troubleshooting de antivirus y "buscar QZ Tray en menu inicio" se actualiza

**`PrinterStatusDot.tsx`**

- Import: `detectPrintBridge` en vez de `detectQZ`

**`public/instalar-impresoras.bat`**

Se reemplaza completamente. Ya no instala QZ Tray ni certificados. En su lugar:
1. Crea directorio `%PROGRAMFILES%\Hoppiness Hub`
2. Descarga `hoppiness-print-bridge.exe` (URL a definir cuando se hostee)
3. Lo registra en el inicio automatico de Windows via registro
4. Lo ejecuta inmediatamente

**`print-bridge/server.js`**

Se copia el archivo del usuario como referencia en el repo. Este archivo se empaqueta por fuera con `pkg` para generar el .exe. No se ejecuta dentro de Lovable.

### Nota importante

El .exe de Print Bridge se debe compilar y hostear por fuera de Lovable (con `pkg server.js --targets node18-win-x64`). La URL de descarga en el .bat se dejara como placeholder hasta que se defina donde hospearlo (puede ser en el storage del backend).


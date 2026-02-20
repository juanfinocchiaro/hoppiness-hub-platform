

## Fix: Impresion directa por IP + eliminar popups de QZ Tray

### Problema 1: "A printer must be specified before printing"

El codigo actual hace:
```text
qz.configs.create(null, { host: "192.168.0.101", port: 9100 })
                   ^^^^
                   ERROR: QZ espera un nombre o un objeto, no null
```

La API de QZ Tray dice que el primer parametro acepta:
- Un **string** con el nombre de impresora del SO
- Un **objeto** `{host, port}` para impresion raw por socket TCP

El fix es cambiar a:
```text
qz.configs.create({ host: "192.168.0.101", port: 9100 })
```

Esto permite imprimir directamente por IP **sin instalar la impresora en Windows**.

### Problema 2: Popup "Allow" cada vez que abris la pagina

QZ Tray solo permite "Remember this decision" cuando recibe un **certificado digital valido**. El codigo actual envia un certificado vacio (`''`), por eso el checkbox no aparece.

Solucion: generar un par de certificado + clave privada autofirmado usando `node-forge` (ya instalado en el proyecto), embeberlo en el codigo, y configurar QZ Tray una sola vez para que lo acepte.

### Cambios tecnicos

**1. Nuevo archivo: `src/lib/qz-certificate.ts`**
- Genera un certificado X.509 autofirmado + clave privada RSA 2048 usando node-forge
- Los guarda en localStorage para reutilizar (se genera una sola vez)
- Exporta funciones `getQZCertificate()` y `signQZData(dataToSign)`

**2. Modificar: `src/lib/qz-print.ts`**

En `setupQZ()`:
- Cambiar `setCertificatePromise` para retornar el certificado PEM autofirmado
- Cambiar `setSignaturePromise` para firmar con la clave privada (SHA512)
- Esto habilita "Remember this decision" en QZ Tray

En `printRaw()`, `printRawBase64()`, `testPrinterConnection()`:
- Cambiar `qz.configs.create(null as any, { host: ip, port })` por `qz.configs.create({ host: ip, port })`
- Esto elimina el error "A printer must be specified"

**3. Configuracion unica en QZ Tray (accion del usuario)**

Para que QZ Tray confie en nuestro certificado autofirmado, hay que agregar una linea al archivo de propiedades de QZ Tray:

```text
Archivo: C:\Program Files\QZ Tray\qz-tray.properties
Agregar: authcert.override=<ruta al certificado>
```

Alternativa: en la primera conexion, QZ Tray va a mostrar el popup con el checkbox "Remember this decision" visible (porque ahora SI hay certificado). El usuario marca el checkbox y listo.

### Impacto

- NO se necesita instalar la impresora en Windows
- NO se necesita extension de Chrome
- El popup aparece UNA sola vez (con "Remember" habilitado)
- La impresion va directo por TCP al puerto 9100 de la impresora


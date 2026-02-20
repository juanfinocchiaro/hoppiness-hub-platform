

## Fix: Clave privada RSA invalida - "Too few bytes to parse DER"

### Problema

El archivo `src/lib/qz-certificate.ts` contiene PEMs fabricados manualmente que no son datos RSA validos. Cuando node-forge intenta parsear la clave privada, falla con "Too few bytes to parse DER" porque los bytes base64 no forman una estructura ASN.1/DER real.

### Solucion en 2 pasos

**Paso 1 (inmediato):** Cambiar `qz-certificate.ts` para generar un par certificado + clave REAL usando node-forge al cargar el modulo. Se cachea en variables del modulo (no localStorage). Esto corrige el error inmediatamente.

Ademas, se loguea los PEMs generados a la consola del navegador con un mensaje claro para que puedas copiarlos.

**Paso 2 (manual, despues):** Copiar los PEMs de la consola y pegarlos como constantes estaticas en el archivo, reemplazando la logica de generacion. Asi quedan fijos para siempre.

### Cambios tecnicos

**Archivo: `src/lib/qz-certificate.ts`** (reescritura)

- Eliminar las constantes `CERT_PEM` y `PRIVATE_KEY_PEM` con datos falsos
- Agregar funcion `generateRealKeyPair()` que usa `forge.pki.rsa.generateKeyPair(2048)` y `forge.pki.createCertificate()` para generar un par real
- Cachear en variables de modulo `_certPem` y `_keyPem` (se genera una sola vez por sesion de pagina)
- Loguear a consola: `console.log("=== COPIAR ESTOS PEMs PARA HARDCODEAR ===", certPem, keyPem)`
- `getQZCertificate()` retorna el certificado generado
- `signQZData()` firma con la clave privada generada

**Sin cambios en otros archivos** - `qz-print.ts` ya importa las funciones correctamente.

### Limitacion temporal

Hasta que copies los PEMs de la consola y los hardcodees, el certificado cambia cada vez que recargas la pagina. Esto significa que QZ Tray pedira "Allow" en cada recarga (aunque el checkbox "Remember" estara disponible, no servira porque el cert cambia).

Una vez que pegues los PEMs reales como constantes, todo funciona como se planeo originalmente: un solo "Allow" por PC para siempre.

### Resultado

- El error "Too few bytes to parse DER" se elimina inmediatamente
- La impresion por IP vuelve a funcionar
- Los PEMs reales quedan disponibles en la consola para hardcodear


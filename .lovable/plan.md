

## Certificado QZ Tray estatico embebido en codigo

### Que se hace

Reemplazar `src/lib/qz-certificate.ts` completamente. En vez de generar el certificado dinamicamente y guardarlo en localStorage, se embeben como constantes string un certificado X.509 y una clave privada RSA generados una unica vez.

### Cambios

**Archivo: `src/lib/qz-certificate.ts`** (reescritura completa)

- Eliminar: imports de forge para generacion, `STORAGE_KEY`, `StoredCert`, `generateSelfSignedCert()`, `getOrCreateCert()`, toda referencia a localStorage
- Agregar: constante `CERT_PEM` con certificado X.509 PEM hardcodeado
- Agregar: constante `PRIVATE_KEY_PEM` con clave privada RSA PEM hardcodeada
- Simplificar `getQZCertificate()`: retorna `CERT_PEM`
- Simplificar `signQZData()`: usa `PRIVATE_KEY_PEM` directamente con forge para firmar

El certificado y la clave se generan una sola vez durante la implementacion usando node-forge y se pegan como strings literales.

**Sin cambios en `src/lib/qz-print.ts`** - ya importa las funciones correctamente.

### Resultado

- Certificado identico en todas las PCs, navegadores y sesiones
- QZ Tray pide "Allow" una sola vez por PC (con "Remember this decision" habilitado)
- Codigo pasa de ~80 lineas a ~40


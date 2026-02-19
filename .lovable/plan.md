
# Asistente de Certificados ARCA

## Resumen

Reemplazar la seccion manual de upload de .crt y .key por un asistente guiado de 3 pasos que genera la clave privada automaticamente en el navegador usando `node-forge`. El franquiciado nunca toca una terminal ni manipula el .key.

---

## Flujo del asistente

```text
Paso 1: Generar solicitud
  - Valida que CUIT y Razon Social esten completos
  - Genera keypair RSA 2048 + CSR en el navegador (node-forge)
  - Guarda .key (PEM base64) en afip_config.clave_privada_enc
  - Guarda .csr (PEM) en afip_config.csr_pem (nuevo campo)
  - Descarga el .csr automaticamente
  - Actualiza estado_certificado = 'csr_generado'

Paso 2: Subir a ARCA
  - Instrucciones paso a paso para subir el .csr en el portal de ARCA
  - Link directo a https://auth.afip.gob.ar
  - Boton para re-descargar el .csr si lo perdio
  - Tip: "Si tu contador maneja la clave fiscal, mandale el .csr"

Paso 3: Subir certificado (.crt)
  - Upload del .crt que ARCA devuelve
  - Al subir, guarda en DB y llama automaticamente a "Probar Conexion"
  - Si funciona: estado = conectado, badge verde
  - Si falla: muestra error, sugiere verificar que el .crt corresponda

Estado completado:
  - Badge "Conectado" + checks verdes
  - Ultimos comprobantes
  - Botones "Probar conexion" y "Regenerar certificado"
```

---

## Migracion SQL

Agregar 2 campos a `afip_config`:

- `estado_certificado` (text, default 'sin_configurar'): maquina de estados del asistente
- `csr_pem` (text, nullable): CSR guardado para poder re-descargarlo

Se usa un trigger de validacion (no CHECK constraint) para los valores permitidos: `sin_configurar`, `csr_generado`, `certificado_subido`, `conectado`, `error`.

---

## Dependencia nueva

- `node-forge` + `@types/node-forge` para generar RSA keypair y CSR en el navegador

---

## Archivos a crear

| Archivo | Descripcion |
|---|---|
| `src/lib/arca-cert-generator.ts` | Funciones `generateArcaCertificate()` y `downloadCSR()` usando node-forge |

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/pages/local/AfipConfigPage.tsx` | Reemplazar seccion "Certificados ARCA" (Card de upload manual) por componente asistente de 3 pasos basado en `estado_certificado` de la config |
| `src/hooks/useAfipConfig.ts` | Agregar mutation `saveKeyAndCSR` para guardar clave + csr + actualizar estado. Agregar campo `csr_pem` y `estado_certificado` al tipo `AfipConfig` |

---

## Detalle tecnico

### `src/lib/arca-cert-generator.ts`

- `generateArcaCertificate({ cuit, razonSocial })`: genera keypair RSA 2048, crea CSR con subject (C=AR, O=razonSocial, CN=HoppinessHub, serialNumber=CUIT), firma con SHA-256, retorna `{ privateKeyPem, csrPem }`
- `downloadCSR(csrPem, cuit)`: crea Blob y descarga como `solicitud_arca_XXXXXXXXXXX.csr`

### Asistente en AfipConfigPage

La seccion de certificados se convierte en un componente con logica condicional segun `config.estado_certificado`:

- **sin_configurar**: muestra CUIT y razon social (readonly, tomados de los datos fiscales), boton "Generar solicitud de certificado" con spinner durante generacion (2-5 seg en mobile)
- **csr_generado**: muestra instrucciones de ARCA numeradas, link externo, boton re-descargar .csr, boton "Ya tengo el .crt" que muestra upload
- **conectado/error**: muestra estado con checks, ultimos comprobantes, botones probar conexion y regenerar

### Hook mutations

- `saveKeyAndCSR(branchId, privateKeyPem, csrPem)`: upsert en afip_config con clave_privada_enc (base64), csr_pem, estado_certificado='csr_generado'
- Al subir .crt: guarda certificado_crt, cambia estado a 'certificado_subido', llama testConnection automaticamente

### Lo que NO cambia

- Edge functions (ya leen .key y .crt de la DB)
- Seccion de datos fiscales (se mantiene igual)
- Seccion modo de operacion (se mantiene igual)
- RLS policies (ya cubren lectura/escritura por franquiciado y superadmin)



## Plan: Proteger la Configuracion ARCA y Corregir el Bug de Produccion

### Problema 1: Bug en la edge function (prioritario)

El error `this.digestAlgorithm.toSchema is not a function` ocurre al construir el CMS SignedData con `asn1js`. La libreria tiene incompatibilidades con Deno en la forma en que se construyen los OIDs para el campo `digestAlgorithm` dentro del `SignerInfo`.

**Solucion**: Reescribir `wsaa.ts` usando la Web Crypto API nativa de Deno + construccion manual de ASN.1 en bytes (sin depender de `asn1js` para la firma). Alternativa mas robusta: usar `node-forge` (que ya esta en el proyecto para generar CSR en el frontend) via `npm:node-forge` en Deno.

### Problema 2: Proteccion de la pagina de facturacion

Actualmente cualquier usuario con acceso al local puede modificar datos criticos. Se necesitan protecciones:

**Cambios en la UI (`AfipConfigPage.tsx`):**

1. **Solo superadmin y franquiciado** pueden ver/editar esta pagina. Encargados, cajeros y empleados no deberian tener acceso.
2. **Bloquear campos criticos cuando ya hay conexion activa:**
   - CUIT: solo lectura una vez conectado
   - Punto de venta: solo lectura una vez conectado  
   - Boton "Regenerar certificado": requiere confirmacion con doble paso ("Esto eliminara la clave actual. Vas a tener que volver a subir el .csr a ARCA.")
   - Boton "Activar Produccion": requiere confirmacion explicita
3. **Agregar boton "Resetear configuracion"** visible solo para superadmin, con confirmacion. Esto limpia certificado + clave + estado pero mantiene datos fiscales.

**Cambios en permisos:**

- Verificar `usePermissionsV2` en la pagina: si `localRole` no es `franquiciado` y `brandRole` no es `superadmin`, redirigir o mostrar acceso denegado.

### Problema 3: Reusar certificado entre sucursales

Como todas las sucursales operan bajo el mismo CUIT, el certificado es el mismo. Lo que cambia es el punto de venta.

**Solucion**: Agregar un boton "Copiar configuracion de otra sucursal" que:
1. Lista las sucursales que ya tienen ARCA configurado
2. Copia: CUIT, razon social, direccion fiscal, certificado, clave privada
3. Solo pide al usuario que ingrese el punto de venta nuevo
4. Ejecuta test de conexion automatico

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `supabase/functions/_shared/wsaa.ts` | Reescribir firma CMS usando `node-forge` en vez de `asn1js` para evitar el bug |
| `src/pages/local/AfipConfigPage.tsx` | Agregar proteccion de roles, bloqueo de campos criticos, confirmaciones, boton resetear |
| `src/components/local/arca/ArcaCertificateWizard.tsx` | Agregar confirmacion al regenerar certificado |
| `src/pages/local/AfipConfigPage.tsx` | Agregar boton "Copiar config de otra sucursal" (solo superadmin) |

### Detalle tecnico: Fix del CMS con node-forge

```text
Antes (asn1js - falla en Deno):
  import * as asn1js from "npm:asn1js@3.0.5"
  // buildCMSSignedData manual con asn1js → "toSchema is not a function"

Despues (node-forge - funciona en Deno):
  import forge from "npm:node-forge@1.3.3"
  // forge.pkcs7.createSignedData() → CMS nativo, probado, sin bugs
  // forge maneja internamente ASN.1, DER, PEM
```

La ventaja de `node-forge` es que ya se usa en el frontend para generar CSR, asi que sabemos que funciona. En Deno se importa como `npm:node-forge`.

### Flujo protegido final

```text
Acceso a /milocal/:id/config/facturacion
  |
  +-- No es superadmin ni franquiciado? --> "Sin acceso"
  |
  +-- Sin configuracion? --> Formulario completo editable
  |
  +-- Con conexion activa?
       +-- CUIT, Punto de Venta: solo lectura
       +-- Certificado: "Regenerar" con confirmacion doble
       +-- Modo: "Activar Produccion" con confirmacion
       +-- "Resetear todo" solo superadmin con confirmacion
       +-- "Copiar a otra sucursal" solo superadmin
```


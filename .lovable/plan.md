
# Integracion AFIP - Facturacion Electronica

## Resumen

Implementar el sistema completo de facturacion electronica con AFIP para cada sucursal. Incluye: tablas de configuracion y log de facturas, edge functions para emitir y probar conexion, pagina de configuracion por local, y hook para emitir facturas desde el POS.

Como todavia no tienen certificados, todo se construye listo para usar pero en modo "homologacion" (testing de AFIP) por defecto. Cuando cada franquiciado tenga su certificado, solo carga los datos y funciona.

---

## Fase 1: Base de Datos (3 tablas + RLS)

### Tabla `afip_config`
Configuracion AFIP por sucursal: CUIT, razon social, direccion fiscal, punto de venta, certificados (.crt y .key encriptado), estado de conexion, contadores de ultimo numero por tipo de factura.

- RLS: solo `is_superadmin` o franquiciado del local pueden leer/escribir
- Usa los helpers existentes `is_superadmin()` y `can_access_branch()`
- `UNIQUE` en `branch_id`

### Tabla `facturas_emitidas`
Log de cada factura emitida: tipo (A/B/C), numero, CAE, montos desglosados (neto, IVA, total), datos del receptor, request/response de AFIP para auditoria.

- RLS: lectura para cualquier rol con acceso al branch
- `UNIQUE` en `(branch_id, tipo_comprobante, punto_venta, numero_comprobante)` para evitar duplicados
- FK opcional a `pedidos(id)`

### Tabla `afip_errores_log`
Log de errores para diagnostico: tipo de error, codigo AFIP, request/response.

- RLS: lectura para franquiciado/encargado del branch

---

## Fase 2: Edge Functions (2 funciones)

### `emitir-factura`
Recibe: branch_id, pedido_id (opcional), tipo_factura (A/B/CF), datos del cliente, items, total.

Flujo:
1. Lee config AFIP del local
2. Inicializa SDK `@afipsdk/afip.js`
3. Consulta ultimo numero a AFIP
4. Arma comprobante con montos (neto/IVA segun tipo)
5. Envia a AFIP y obtiene CAE
6. Guarda en `facturas_emitidas`
7. Actualiza pedido con datos fiscales
8. Retorna numero + CAE

### `probar-conexion-afip`
Recibe: branch_id. Intenta conectar con AFIP usando los certificados, obtiene ultimos numeros de cada tipo de comprobante, actualiza estado en `afip_config`.

### Secrets necesarios
- `AFIP_ENCRYPTION_KEY`: clave para encriptar/desencriptar las claves privadas almacenadas
- `AFIP_PRODUCTION`: "false" para homologacion, "true" para produccion

---

## Fase 3: Frontend - Configuracion

### Pagina `AfipConfigPage`
Ruta: `/milocal/:branchId/config/facturacion`

Formulario con:
- Datos fiscales: CUIT, razon social, direccion fiscal, inicio actividades
- Punto de venta (numero)
- Upload de certificado (.crt) y clave privada (.key)
- Boton "Probar Conexion" que llama a la edge function
- Badge de estado (Conectado/Error/Sin configurar)
- Ultimos numeros de factura A, B, C

Solo visible para franquiciado del local y superadmin.

### Sidebar
Agregar link "Facturacion" en la seccion "Configuracion" del sidebar de Mi Local, con icono `Receipt`.

### Hook `useAfipConfig`
- `useAfipConfig(branchId)`: query de la config
- `useAfipConfigMutations()`: save y testConnection
- `useEmitirFactura()`: emision desde el POS

---

## Fase 4: Integracion con POS (posterior)

La integracion con el flujo de cobro del POS (modal para elegir tipo de factura antes de enviar a cocina) se deja para una segunda iteracion, una vez que al menos un local tenga certificados configurados y probados. Esta fase solo deja la infraestructura lista.

---

## Archivos a crear

| Archivo | Descripcion |
|---|---|
| `src/hooks/useAfipConfig.ts` | Hook con queries y mutations |
| `src/pages/local/AfipConfigPage.tsx` | Pagina de configuracion AFIP |
| `supabase/functions/emitir-factura/index.ts` | Edge function emision |
| `supabase/functions/probar-conexion-afip/index.ts` | Edge function prueba conexion |

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/App.tsx` | Agregar ruta `config/facturacion` |
| `src/components/layout/LocalSidebar.tsx` | Link "Facturacion" en seccion Config |
| `supabase/config.toml` | NO se toca (auto-generado) |

## Migracion SQL

1 migracion con las 3 tablas + indices + RLS policies + trigger de updated_at para afip_config.

---

## Orden de implementacion

1. Migracion SQL (tablas + RLS)
2. Edge functions (emitir-factura + probar-conexion-afip)
3. Hook useAfipConfig
4. Pagina AfipConfigPage
5. Ruta en App.tsx + link en sidebar
6. Solicitar secrets (AFIP_ENCRYPTION_KEY, AFIP_PRODUCTION)

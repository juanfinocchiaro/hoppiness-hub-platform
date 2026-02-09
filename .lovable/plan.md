

# Separar responsabilidades: Compras vs Proveedores

## Problema actual

Hay funcionalidades duplicadas entre las dos secciones:

- En **Compras y Servicios** se puede: cargar facturas, ver facturas, pagar facturas y eliminar facturas
- En **Proveedores** se puede: ver proveedores, crear/editar proveedores, y al entrar a un proveedor ver su cuenta corriente donde tambien se puede pagar

El boton de "Pagar" aparece en ambos lados, generando confusion.

## Nueva separacion propuesta

| Seccion | Responsabilidad |
|---------|----------------|
| **Compras y Servicios** | Cargar nuevas facturas, ver listado de facturas, expandir detalle de items, eliminar facturas manuales |
| **Proveedores** | Ver todos los proveedores (marca + locales), crear/editar proveedores locales, ver cuenta corriente por proveedor, registrar pagos |

## Cambios concretos

### 1. ComprasPage.tsx - Quitar funcionalidad de pago

- Eliminar el boton de "Registrar pago" (icono de tarjeta de credito) de cada fila
- Eliminar el estado `paying` y el componente `PagoProveedorModal`
- Eliminar la columna "Saldo" (ya que sin poder pagar ahi, no tiene sentido mostrarla)
- Mantener: nueva factura, listado, expandir items, eliminar

### 2. ComprasPage.tsx - Agregar link al proveedor

- Hacer que el nombre del proveedor en la tabla sea un link que lleve a la cuenta corriente del proveedor (`/milocal/:branchId/finanzas/proveedores/:proveedorId`)
- Esto conecta ambas secciones de forma natural: "veo la factura -> quiero pagar -> click en el proveedor -> cuenta corriente -> pago"

### 3. Sin cambios en Proveedores

- `ProveedoresLocalPage.tsx` y `CuentaCorrienteProveedorPage.tsx` ya funcionan correctamente con la logica de cuenta corriente y pagos

## Detalle tecnico

**Archivos a modificar:**
- `src/pages/local/ComprasPage.tsx`: eliminar import de `PagoProveedorModal`, eliminar estado `paying`, eliminar columna Saldo, eliminar boton pagar, agregar link en nombre de proveedor hacia cuenta corriente

**Archivos sin cambios:**
- `src/pages/local/ProveedoresLocalPage.tsx` (ya correcto)
- `src/pages/local/CuentaCorrienteProveedorPage.tsx` (ya correcto)
- `src/components/layout/LocalSidebar.tsx` (ya correcto)


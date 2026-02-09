
# Agregar datos bancarios a Proveedores

## Contexto
Actualmente la tabla `proveedores` no tiene campos para datos bancarios. Los proveedores envian sus datos de cuenta (CBU, alias, numero de cuenta, banco) para recibir pagos por transferencia, y hoy no hay donde guardarlos.

## Cambios

### 1. Migracion de base de datos
Agregar columnas a la tabla `proveedores`:

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| `banco` | varchar | Nombre del banco |
| `numero_cuenta` | varchar | Numero de cuenta bancaria |
| `cbu` | varchar | CBU (22 digitos) |
| `alias_cbu` | varchar | Alias de CBU |
| `titular_cuenta` | varchar | Titular de la cuenta (si difiere de razon social) |

Tambien agregar campos de contacto adicionales ya que los proveedores suelen tener multiples contactos (cobranzas, administracion):

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| `telefono_secundario` | varchar | Segundo telefono (ej: administracion) |
| `contacto_secundario` | varchar | Nombre del segundo contacto |

### 2. Actualizar tipos TypeScript
En `src/types/financial.ts`, agregar los nuevos campos a `ProveedorFormData`.

### 3. Actualizar formulario de proveedor
En `src/components/finanzas/ProveedorFormModal.tsx`:
- Agregar nueva seccion **"Datos Bancarios"** con icono de banco
- Campos: Banco, Numero de Cuenta, CBU, Alias CBU, Titular
- Agregar seccion de **contacto secundario** (telefono + nombre)

### 4. Sin cambios en hooks
El hook `useProveedores.ts` ya usa spread (`...data`) al insertar/actualizar, asi que los nuevos campos se guardan automaticamente.

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| Nueva migracion SQL | ALTER TABLE proveedores ADD COLUMN (7 columnas) |
| `src/types/financial.ts` | Agregar campos bancarios a ProveedorFormData |
| `src/components/finanzas/ProveedorFormModal.tsx` | Nueva seccion "Datos Bancarios" + contacto secundario |

## Detalle tecnico
- Todas las columnas nuevas son nullable (opcionales)
- No se requieren cambios en RLS ni en hooks
- El formulario existente se extiende con una seccion mas, sin romper nada


# Simplificar flujo: Gastos pasa a ser solo "gastos menores sin factura"

## Problema actual
El usuario ve dos lugares para registrar servicios:
- **Compras** > Servicio > "Alquiler Local", "EPEC", "Canon 4.5%", etc. (vinculado a proveedor + factura)
- **Gastos** > Categoria "Servicios (Luz, Gas, Internet)", "Alquileres", etc. (texto libre, sin proveedor)

Esto genera confusion sobre donde cargar cada cosa.

## Regla de negocio definida
**Todo lo que tiene comprobante/factura de un proveedor va por Compras.** Gastos queda reservado para desembolsos menores sin factura formal (propinas, peajes, imprevistos, caja chica).

## Cambios propuestos

### 1. Renombrar y simplificar "Gastos"
- Renombrar la seccion a **"Gastos Menores"** (titulo + sidebar)
- Cambiar subtitulo a: "Desembolsos menores sin factura (caja chica, propinas, imprevistos)"
- Reemplazar las categorias actuales (que se solapan con servicios) por categorias propias de gastos menores:

```text
Categorias nuevas:
- Caja chica
- Propinas / Gratificaciones
- Movilidad / Transporte
- Mantenimiento express
- Insumos menores (compras sin factura)
- Varios
```

Esto elimina "Servicios", "Alquileres", "Sueldos", "Impuestos", "Marketing" de Gastos porque todos esos conceptos se cargan por Compras con su factura correspondiente.

### 2. Renombrar "Compras" a "Compras y Servicios"
- Actualizar titulo de la pagina y sidebar para que quede claro que ahi se cargan tanto insumos fisicos como servicios (alquiler, luz, honorarios, canon)
- Subtitulo: "Facturas de proveedores: insumos y servicios"

### 3. Actualizar sidebar de Mi Local
- "Compras" pasa a llamarse **"Compras y Servicios"**
- "Gastos" pasa a llamarse **"Gastos Menores"**

### 4. Sin cambios de base de datos
- La tabla `gastos` sigue funcionando igual, solo cambian las categorias en el frontend (constante `CATEGORIA_GASTO_OPTIONS`)
- La tabla `facturas_proveedores` + `items_factura` no cambia

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/types/compra.ts` | Reemplazar `CATEGORIA_GASTO_OPTIONS` con categorias de gastos menores |
| `src/components/finanzas/GastoFormModal.tsx` | Actualizar titulo del modal a "Registrar Gasto Menor" |
| `src/pages/local/GastosPage.tsx` | Titulo "Gastos Menores", subtitulo actualizado |
| `src/pages/local/ComprasPage.tsx` | Titulo "Compras y Servicios", subtitulo actualizado |
| `src/components/layout/LocalSidebar.tsx` | Labels del sidebar: "Compras y Servicios", "Gastos Menores" |

## Detalle tecnico
- Solo se modifican constantes de texto y labels en 5 archivos
- No hay migracion de base de datos
- No hay cambios en hooks ni logica de negocio
- Los registros existentes en la tabla `gastos` mantienen su `categoria_principal` original (no se rompen, simplemente las categorias viejas dejarian de aparecer en el dropdown pero se siguen mostrando en la tabla si existen)

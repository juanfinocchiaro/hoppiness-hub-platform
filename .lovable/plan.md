

## Separar Ingredientes por tipo de proveedor

### Resumen
Dividir la tabla actual de Ingredientes en dos secciones dentro de la misma pestaña: una para ingredientes con **proveedor obligatorio** y otra para los de **proveedor sugerido (semi-libre)**. Es un cambio puramente visual, no requiere cambios en la base de datos.

### Cambio propuesto

**Archivo**: `src/pages/admin/InsumosPage.tsx`

Dentro del `TabsContent value="ingredientes"`, en lugar de una sola tabla, renderizar dos bloques:

1. **"Proveedor Obligatorio"** - Filtra `nivel_control !== 'semi_libre'` (o es null/obligatorio)
   - Muestra la tabla tal cual esta hoy, sin el badge "Sugerido"
   
2. **"Proveedor Sugerido"** - Filtra `nivel_control === 'semi_libre'`
   - Misma estructura de tabla, con el badge "Sugerido" en la columna Proveedor

Cada sección tendra un subtitulo (h3 o similar) y su propia tabla con bordes. El buscador aplica a ambas tablas. El sorting se mantiene independiente (mismos estados compartidos).

### Impacto
- Solo se modifica `InsumosPage.tsx`
- No se tocan hooks, tipos ni base de datos
- No rompe nada, es un refactor visual del mismo array filtrado en dos grupos

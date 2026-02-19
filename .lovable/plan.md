

## Plan: Rediseno Completo de la Pagina de Facturacion ARCA

Basado en la guia de rediseno que subiste, vamos a reestructurar completamente la pagina en 3 zonas claras, agregar protecciones serias contra acciones destructivas, y mejorar la guia integrada.

### Cambios principales

**1. Reestructurar en 3 zonas**

La pagina actual mezcla todo. Se reorganiza asi:

```text
ZONA 1: Estado Operativo (lo que se mira dia a dia)
  - Cards de Modo (Produccion/Homologacion) y Conexion lado a lado
  - CUIT y Punto de Venta como referencia rapida
  - Ultimos comprobantes con formato #00000000 y texto explicativo
  - Boton "Verificar conexion ahora"
  - Banner de alerta si esta en Homologacion

ZONA 2: Configuracion (se toca una vez)
  - Datos Fiscales en modo solo lectura, con boton "Editar" discreto
  - Certificado ARCA (wizard existente, ya funciona bien)

ZONA 3: Zona Restringida (colapsada, con friccion)
  - Collapsible cerrado por defecto
  - "Cambiar modo" con confirmacion por texto (escribir "HOMOLOGACION")
  - "Resetear todo" con confirmacion por texto (escribir "RESETEAR ARCA")
  - "Copiar datos fiscales" (solo superadmin, renombrado)
```

**2. Confirmaciones con texto obligatorio**

Reemplazar los ConfirmDialog simples por un nuevo componente `DangerConfirmDialog` que requiere escribir una palabra exacta para confirmar. Esto aplica a:
- Cambiar a Homologacion: escribir "HOMOLOGACION"
- Resetear configuracion: escribir "RESETEAR ARCA"  
- Regenerar certificado: escribir "REGENERAR"

**3. Banner permanente de Homologacion**

Cuando `es_produccion = false`, mostrar un banner amarillo/naranja fijo arriba de todo:
```text
MODO HOMOLOGACION ACTIVO
Las facturas emitidas NO son validas fiscalmente.
[Cambiar a Produccion]
```

**4. Mejoras en Estado Operativo**

- Numeros de comprobante formateados como `#00000000` en vez de solo `0`
- Texto explicativo: "Se sincronizan con ARCA al emitir facturas. Si recien configuraste, es normal que esten en 0."
- Card de conexion con error muestra mensaje amigable mapeado (no el error crudo de ARCA)

**5. Copiar config renombrado y limitado**

- Renombrar a "Copiar datos fiscales de otra sucursal"
- Solo copia: CUIT, razon social, direccion, inicio actividades
- NO copia: certificado, clave privada, punto de venta
- Punto de venta queda vacio para que el usuario lo complete

### Archivos a crear/modificar

| Archivo | Accion |
|---|---|
| `src/components/ui/danger-confirm-dialog.tsx` | Crear: dialogo con input de texto obligatorio |
| `src/pages/local/AfipConfigPage.tsx` | Reescribir: 3 zonas, banner homologacion, zona restringida colapsada |
| `src/components/local/arca/ArcaCertificateWizard.tsx` | Modificar: usar DangerConfirmDialog para regenerar |
| `src/components/local/arca/CopyArcaConfigDialog.tsx` | Modificar: solo copiar datos fiscales, no certificado |

### Detalle tecnico

**DangerConfirmDialog**: Componente reutilizable basado en AlertDialog que:
- Recibe `confirmWord` (la palabra que hay que escribir)
- El boton de confirmar esta deshabilitado hasta que el input coincida
- Muestra las consecuencias en una lista con iconos de X roja
- Se puede reusar en cualquier parte de la app para acciones destructivas

**Zona Restringida**: Usa el componente `Collapsible` de Radix (ya existe en el proyecto) envuelto en una Card con borde rojo sutil. Cerrado por defecto.

**Mapeo de errores**: Se agrega un helper `getArcaErrorMessage(error: string)` que convierte errores tecnicos de ARCA en mensajes amigables con sugerencias de accion, segun la tabla de la guia.


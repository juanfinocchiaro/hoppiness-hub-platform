

## Plan: Convivencia WebApp + MasDelivery

### Situacion actual

- `/pedir` abre un iframe de MasDelivery (para todos los locales)
- `/pedir/:branchSlug` ya existe como ruta de la nueva WebApp
- La tabla `webapp_config` tiene un campo `estado` por sucursal (abierto/pausado/cerrado)
- Todos los locales estan en `estado = 'cerrado'` en webapp_config
- El header y footer linkean a `/pedir` (MasDelivery)

### Solucion propuesta

Usar el campo `estado` de `webapp_config` como flag. Si Manantiales tiene `estado != 'cerrado'`, la WebApp esta activa para ese local. Los demas siguen yendo a MasDelivery.

Los cambios son minimos:

**1. Agregar campo `webapp_activa` a `webapp_config`**

Un booleano simple `webapp_activa` (default `false`). Cuando es `true`, el local usa la WebApp propia. Cuando es `false`, se redirige a MasDelivery. Esto es mas claro que depender solo del `estado`.

**2. Modificar `/pedir` para mostrar selector de locales**

La pagina `/pedir` pasa de ser solo un iframe de MasDelivery a un selector inteligente:
- Muestra las sucursales activas
- Si el local tiene `webapp_activa = true`, el boton lleva a `/pedir/manantiales` (WebApp propia)
- Si no, el boton abre MasDelivery (link externo)

Asi el usuario elige su local y se lo rutea al sistema correcto.

**3. Actualizar el header/footer**

El link "Pedi Online" sigue apuntando a `/pedir`. No cambia nada ahi.

**4. Fallback en PedirPage (WebApp)**

Si alguien entra a `/pedir/general-paz` pero General Paz no tiene `webapp_activa`, mostrar un mensaje amigable con boton a MasDelivery en vez de un error.

### Resumen de cambios

| Archivo | Cambio |
|---|---|
| Migracion SQL | Agregar columna `webapp_activa` (boolean, default false) a `webapp_config` |
| `src/pages/Pedir.tsx` | Reescribir: mostrar grid de sucursales con ruteo inteligente |
| `src/pages/webapp/PedirPage.tsx` | Agregar fallback si el local no tiene WebApp activa |
| `src/hooks/useWebappMenu.ts` | Incluir `webapp_activa` en la query de config |

### Detalle tecnico

La pagina `/pedir` va a hacer una query publica a `branches` + `webapp_config` para saber que locales tienen WebApp y cuales no. Las cards de cada sucursal muestran:
- Nombre y direccion
- Badge "Nuevo: Pedi directo" si tiene WebApp
- Badge "Via MasDelivery" si no
- Boton que rutea al destino correcto

Para activar Manantiales, simplemente se hace un UPDATE en la DB poniendo `webapp_activa = true` para su branch_id.

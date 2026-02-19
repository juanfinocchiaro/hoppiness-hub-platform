

## Plan: Robustez del Sistema de Facturacion ARCA para Produccion

### Problemas detectados

1. **Concurrencia**: Si dos cajeros emiten factura al mismo segundo, ambos leen el mismo `ultimo_nro_factura_X`, ambos intentan el mismo numero. ARCA rechaza el segundo pero no hay retry automatico.
2. **Sin idempotencia por pedido**: No hay proteccion para evitar facturar dos veces el mismo pedido (doble click, error de red, etc.)
3. **Falta sincronizacion de numeros**: Si alguien emite una factura desde el portal de ARCA directamente, el sistema local queda desincronizado.

### Solucion propuesta

#### 1. Lock optimista con SELECT FOR UPDATE (Edge Function)

Cambiar `emitir-factura` para que use una transaccion con lock en la fila de `afip_config`, evitando que dos requests lean el mismo numero:

```text
Flujo actual (riesgoso):
  Request A: lee ultimo_nro = 5 --> emite con 6
  Request B: lee ultimo_nro = 5 --> emite con 6 --> ARCA rechaza

Flujo nuevo (seguro):
  Request A: lock fila --> lee 5 --> emite 6 --> update a 6 --> unlock
  Request B: espera lock --> lee 6 --> emite 7 --> update a 7 --> unlock
```

Implementacion: crear una funcion RPC en la DB que atomicamente incremente y devuelva el proximo numero:

```sql
CREATE FUNCTION obtener_proximo_numero_factura(
  _branch_id UUID, _tipo TEXT
) RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE v_campo TEXT; v_numero INTEGER;
BEGIN
  v_campo := 'ultimo_nro_factura_' || lower(_tipo);
  
  EXECUTE format(
    'UPDATE afip_config SET %I = %I + 1 WHERE branch_id = $1 RETURNING %I',
    v_campo, v_campo, v_campo
  ) INTO v_numero USING _branch_id;
  
  RETURN v_numero;
END;
$$;
```

Esto garantiza atomicidad incluso con multiples PCs.

#### 2. Proteccion contra doble facturacion de pedido

Agregar validacion en `emitir-factura`: si viene `pedido_id`, verificar que no exista ya una factura emitida para ese pedido.

```text
IF pedido_id:
  SELECT FROM facturas_emitidas WHERE pedido_id = pedido_id
  IF exists --> return error "Este pedido ya fue facturado"
```

#### 3. Sincronizacion de numeros al probar conexion

Esto ya esta implementado: cuando se ejecuta `probar-conexion-afip` en modo produccion, consulta `FECompUltimoAutorizado` y actualiza los numeros locales. Esto cubre el caso de facturas emitidas fuera del sistema.

#### 4. Punto de venta: uno o dos?

**Recomendacion: Un solo punto de venta por sucursal.** Razones:
- ARCA permite emitir desde multiples dispositivos con el mismo punto de venta
- Con el fix de concurrencia (punto 1), no hay riesgo de colision
- Simplifica la operacion: un solo numerador, un solo certificado
- Si en el futuro necesitan separar (ej: salon vs delivery), se puede agregar otro punto de venta en la config sin tocar codigo

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| Nueva migracion SQL | Crear funcion `obtener_proximo_numero_factura` |
| `supabase/functions/emitir-factura/index.ts` | Usar RPC atomico para numeros + validar pedido no duplicado |

### Resumen tecnico

- Se crea una funcion de base de datos que atomicamente incrementa el contador de facturas, eliminando la ventana de concurrencia
- Se agrega validacion de pedido ya facturado para evitar duplicados
- No se necesitan cambios en el frontend ni en la configuracion por sucursal
- Un punto de venta por local es suficiente para multiples PCs


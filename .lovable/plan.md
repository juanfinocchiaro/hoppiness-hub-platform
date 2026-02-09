

# Plan: Crear Base de Datos del Sistema Financiero (Solo Schema)

## Alcance

Crear todas las tablas, triggers, funciones, vistas e indices del plan financiero MVP. Sin cambios de frontend.

## Consideraciones Tecnicas Importantes

Antes de implementar el SQL del plan tal cual, hay correcciones necesarias para que funcione correctamente en este proyecto:

1. **Foreign keys a auth.users**: El plan usa `REFERENCES auth.users(id)` en columnas como `created_by`. Esto NO se debe hacer en este proyecto. Se reemplazara por `UUID` sin FK directa (siguiendo el patron existente donde `profiles.id` es el equivalente).

2. **CHECK constraints con NOW()**: El plan tiene constraints como `expire_at > now()` que son inmutables y causan fallos. Se usaran triggers de validacion en su lugar.

3. **RLS Policies**: Se crearan usando las funciones SECURITY DEFINER que ya existen (`is_superadmin`, `can_access_branch`, `is_financial_for_branch`, `has_financial_access`, etc.) y nuevas donde sea necesario.

4. **Soft delete pattern**: El plan lo define bien con `deleted_at` + indices parciales `WHERE deleted_at IS NULL`.

## Migraciones (en orden)

Se dividira en 3 migraciones para mantener el orden de dependencias:

### Migracion 1: Tablas base (sin dependencias cruzadas)

```text
- categorias_insumo
- insumos (depende de categorias_insumo)
- proveedores (depende de branches)
- periodos (depende de branches)
- configuracion_impuestos (depende de branches)
- socios (depende de branches)
- financial_audit_log (independiente)
```

### Migracion 2: Tablas transaccionales

```text
- compras (depende de branches, proveedores, insumos)
- pagos_proveedores (depende de compras, proveedores)
- gastos (depende de branches)
- ventas_mensuales_local (depende de branches)
- canon_liquidaciones (depende de branches, ventas_mensuales_local)
- pagos_canon (depende de canon_liquidaciones)
- consumos_manuales (depende de branches)
- movimientos_socio (depende de socios)
- distribuciones_utilidades (depende de branches)
```

### Migracion 3: Triggers, funciones y vistas

```text
- Trigger: calcular_porcentaje_ft (ventas_mensuales_local)
- Trigger: calcular_canon (canon_liquidaciones)
- Trigger: actualizar_saldo_compra (pagos_proveedores)
- Trigger: actualizar_saldo_canon (pagos_canon)
- Trigger: validar_periodo_abierto (compras, gastos, consumos_manuales)
- Trigger: check_porcentajes_suman_100 (socios)
- Trigger: calcular_saldo_socio (movimientos_socio)
- Trigger: procesar_distribucion_utilidades
- Trigger: audit_financial_changes (todas las tablas)
- Vista: precio_promedio_mes
- Vista: cuenta_corriente_proveedores
- Vista: balance_socios
- Funcion helper: get_iibb_alicuota
```

### Migracion 4: RLS Policies

Politicas usando funciones existentes:

- **Tablas de marca** (categorias_insumo, insumos): superadmin/coordinador pueden escribir, staff puede leer
- **Tablas por sucursal** (compras, gastos, etc.): `can_access_branch()` para lectura, `is_financial_for_branch()` para escritura
- **Proveedores**: ambito marca = lectura global, ambito local = solo esa sucursal
- **Socios**: solo superadmin y franquiciado del local
- **Audit log**: solo superadmin puede leer, nadie puede escribir directamente (via trigger SECURITY DEFINER)
- **Periodos**: superadmin puede cerrar/reabrir, franquiciado puede cerrar

## Tablas totales a crear: 15

```text
categorias_insumo, insumos, proveedores, compras, 
pagos_proveedores, gastos, ventas_mensuales_local,
canon_liquidaciones, pagos_canon, consumos_manuales,
socios, movimientos_socio, distribuciones_utilidades,
periodos, configuracion_impuestos
```

(financial_audit_log ya existe como audit_logs - se reutilizara o se creara version financiera separada)

## Resultado

Base de datos lista para que en futuras iteraciones se conecten los modulos de frontend (Compras, Gastos, Canon, etc.) uno por uno.


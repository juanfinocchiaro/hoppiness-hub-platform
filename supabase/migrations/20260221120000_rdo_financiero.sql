-- Resultado Financiero: function to aggregate cash-basis income and expenses by period
-- Unlike the economic result (accrual-based), this reflects actual cash movements.

create or replace function get_rdo_financiero(
  _branch_id uuid,
  _periodo text  -- 'YYYY-MM'
)
returns jsonb
language plpgsql
security definer
as $$
declare
  _start date;
  _end   date;
  _result jsonb;
begin
  _start := (_periodo || '-01')::date;
  _end   := (_start + interval '1 month')::date;

  with
  -- 1) Income from POS sales (pedido_pagos grouped by method)
  ingresos_pos as (
    select
      pp.metodo,
      coalesce(sum(pp.monto), 0) as total
    from pedido_pagos pp
    join pedidos p on p.id = pp.pedido_id
    where p.branch_id = _branch_id
      and p.created_at >= _start
      and p.created_at < _end
      and p.estado not in ('cancelado')
    group by pp.metodo
  ),

  -- 2) Total POS income
  ingresos_total as (
    select coalesce(sum(total), 0) as total from ingresos_pos
  ),

  -- 3) Supplier payments (actual cash out)
  pagos_proveedores_agg as (
    select coalesce(sum(monto), 0) as total
    from pagos_proveedores
    where branch_id = _branch_id
      and fecha_pago >= _start
      and fecha_pago < _end
      and deleted_at is null
  ),

  -- 4) Expenses paid (gastos with estado='pagado')
  gastos_pagados as (
    select
      categoria_principal,
      coalesce(sum(monto), 0) as total
    from gastos
    where branch_id = _branch_id
      and periodo = _periodo
      and estado = 'pagado'
      and deleted_at is null
    group by categoria_principal
  ),
  gastos_total as (
    select coalesce(sum(total), 0) as total from gastos_pagados
  ),

  -- 5) Salary advances paid
  adelantos_agg as (
    select coalesce(sum(amount), 0) as total
    from salary_advances
    where branch_id = _branch_id
      and paid_at >= _start
      and paid_at < _end
      and status in ('paid', 'transferred', 'deducted')
  ),

  -- 6) Partner movements (retiros = outflow, aportes = inflow)
  socios_retiros as (
    select coalesce(sum(monto), 0) as total
    from movimientos_socio
    where branch_id = _branch_id
      and periodo = _periodo
      and tipo in ('retiro', 'distribucion')
      and deleted_at is null
  ),
  socios_aportes as (
    select coalesce(sum(monto), 0) as total
    from movimientos_socio
    where branch_id = _branch_id
      and periodo = _periodo
      and tipo = 'aporte'
      and deleted_at is null
  ),

  -- 7) Investments paid (CAPEX)
  inversiones_agg as (
    select coalesce(sum(monto_total), 0) as total
    from inversiones
    where branch_id = _branch_id
      and periodo = _periodo
      and estado = 'pagado'
      and deleted_at is null
  )

  select jsonb_build_object(
    'ingresos', jsonb_build_object(
      'por_metodo', (select coalesce(jsonb_object_agg(metodo, total), '{}'::jsonb) from ingresos_pos),
      'total', (select total from ingresos_total),
      'aportes_socios', (select total from socios_aportes)
    ),
    'egresos', jsonb_build_object(
      'proveedores', (select total from pagos_proveedores_agg),
      'gastos_por_categoria', (select coalesce(jsonb_object_agg(categoria_principal, total), '{}'::jsonb) from gastos_pagados),
      'gastos_total', (select total from gastos_total),
      'adelantos_sueldo', (select total from adelantos_agg),
      'retiros_socios', (select total from socios_retiros),
      'inversiones_capex', (select total from inversiones_agg)
    ),
    'resultado_financiero', (select total from ingresos_total) + (select total from socios_aportes) - (select total from pagos_proveedores_agg) - (select total from gastos_total) - (select total from adelantos_agg) - (select total from socios_retiros),
    'flujo_neto', (select total from ingresos_total) + (select total from socios_aportes) - (select total from pagos_proveedores_agg) - (select total from gastos_total) - (select total from adelantos_agg) - (select total from socios_retiros) - (select total from inversiones_agg)
  ) into _result;

  return _result;
end;
$$;

-- =====================================================================
-- Migration: Channel Pricing, Fiscal Reports, Enhanced Expenses
-- =====================================================================

-- ─── 1. CHANNEL PRICING (Listas de precios por canal) ─────────────

create table if not exists price_lists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel text not null, -- 'mostrador', 'webapp', 'rappi', 'pedidos_ya', 'mp_delivery'
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists price_list_items (
  id uuid primary key default gen_random_uuid(),
  price_list_id uuid not null references price_lists(id) on delete cascade,
  item_carta_id uuid not null references items_carta(id) on delete cascade,
  precio numeric(12,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(price_list_id, item_carta_id)
);

create index idx_pli_price_list on price_list_items(price_list_id);
create index idx_pli_item on price_list_items(item_carta_id);

alter table price_lists enable row level security;
alter table price_list_items enable row level security;

create policy "price_lists_read" on price_lists for select using (true);
create policy "price_lists_write" on price_lists for all using (public.is_superadmin(auth.uid()));
create policy "price_list_items_read" on price_list_items for select using (true);
create policy "price_list_items_write" on price_list_items for all using (public.is_superadmin(auth.uid()));

-- ─── 2. FISCAL Z CLOSINGS (Cierres Z) ────────────────────────────

create table if not exists fiscal_z_closings (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  pos_point_of_sale integer not null,
  z_number integer not null,
  date date not null,
  period_from timestamptz not null,
  period_to timestamptz not null,

  total_invoices integer not null default 0,
  total_invoices_b integer not null default 0,
  total_invoices_c integer not null default 0,
  total_tickets integer not null default 0,
  total_credit_notes_b integer not null default 0,
  total_credit_notes_c integer not null default 0,

  first_voucher_type text,
  first_voucher_number text,
  last_voucher_type text,
  last_voucher_number text,

  taxable_21 numeric(15,2) not null default 0,
  vat_21 numeric(15,2) not null default 0,
  taxable_105 numeric(15,2) not null default 0,
  vat_105 numeric(15,2) not null default 0,
  exempt numeric(15,2) not null default 0,
  non_taxable numeric(15,2) not null default 0,
  other_taxes numeric(15,2) not null default 0,

  subtotal_net numeric(15,2) not null default 0,
  total_vat numeric(15,2) not null default 0,
  total_sales numeric(15,2) not null default 0,
  total_credit_notes_amount numeric(15,2) not null default 0,
  net_total numeric(15,2) not null default 0,

  payment_cash numeric(15,2) not null default 0,
  payment_debit numeric(15,2) not null default 0,
  payment_credit numeric(15,2) not null default 0,
  payment_qr numeric(15,2) not null default 0,
  payment_transfer numeric(15,2) not null default 0,

  generated_by uuid references auth.users(id),
  generated_at timestamptz not null default now(),
  is_locked boolean not null default true,

  created_at timestamptz not null default now(),

  unique(branch_id, pos_point_of_sale, z_number),
  unique(branch_id, pos_point_of_sale, date)
);

create index idx_z_closings_branch_date on fiscal_z_closings(branch_id, date);
create index idx_z_closings_branch_z on fiscal_z_closings(branch_id, pos_point_of_sale, z_number);

alter table fiscal_z_closings enable row level security;

create policy "z_closings_read" on fiscal_z_closings
  for select using (public.has_branch_access_v2(auth.uid(), branch_id));

create policy "z_closings_insert" on fiscal_z_closings
  for insert with check (public.has_branch_access_v2(auth.uid(), branch_id));

-- No UPDATE or DELETE policies — Z closings are immutable

-- ─── 3. FUNCTION: Generate Z Closing ──────────────────────────────

create or replace function generate_z_closing(
  p_branch_id uuid,
  p_date date default current_date
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_pv integer;
  v_next_z integer;
  v_existing uuid;
  v_result fiscal_z_closings;
begin
  -- Get punto_venta from afip_config
  select punto_venta into v_pv
  from afip_config
  where branch_id = p_branch_id
  limit 1;

  if v_pv is null then
    raise exception 'No hay punto de venta configurado para este local';
  end if;

  -- Check if Z already exists for this date
  select id into v_existing
  from fiscal_z_closings
  where branch_id = p_branch_id
    and pos_point_of_sale = v_pv
    and date = p_date;

  if v_existing is not null then
    raise exception 'Ya existe un Cierre Z para esta fecha y punto de venta';
  end if;

  -- Get next Z number
  select coalesce(max(z_number), 0) + 1 into v_next_z
  from fiscal_z_closings
  where branch_id = p_branch_id
    and pos_point_of_sale = v_pv;

  -- Verify previous Z exists (no gaps)
  if v_next_z > 1 then
    if not exists (
      select 1 from fiscal_z_closings
      where branch_id = p_branch_id
        and pos_point_of_sale = v_pv
        and z_number = v_next_z - 1
    ) then
      raise exception 'Falta generar el Cierre Z anterior (N° %)', v_next_z - 1;
    end if;
  end if;

  -- Build and insert Z from facturas_emitidas
  insert into fiscal_z_closings (
    branch_id, pos_point_of_sale, z_number, date,
    period_from, period_to,
    total_invoices, total_invoices_b, total_invoices_c,
    total_tickets, total_credit_notes_b, total_credit_notes_c,
    first_voucher_type, first_voucher_number,
    last_voucher_type, last_voucher_number,
    taxable_21, vat_21, taxable_105, vat_105,
    exempt, non_taxable, other_taxes,
    subtotal_net, total_vat, total_sales,
    total_credit_notes_amount, net_total,
    payment_cash, payment_debit, payment_credit,
    payment_qr, payment_transfer,
    generated_by
  )
  select
    p_branch_id,
    v_pv,
    v_next_z,
    p_date,
    coalesce(min(fe.created_at), p_date::timestamptz),
    coalesce(max(fe.created_at), p_date::timestamptz),
    -- Counters
    count(*) filter (where fe.tipo_comprobante not in ('NC_A','NC_B','NC_C')),
    count(*) filter (where fe.tipo_comprobante = 'B'),
    count(*) filter (where fe.tipo_comprobante = 'C'),
    0, -- tickets (no ticket type in current schema)
    count(*) filter (where fe.tipo_comprobante = 'NC_B'),
    count(*) filter (where fe.tipo_comprobante = 'NC_C'),
    -- First/last voucher
    (select tipo_comprobante from facturas_emitidas
     where branch_id = p_branch_id and punto_venta = v_pv
       and date(created_at at time zone 'America/Argentina/Cordoba') = p_date
       and cae is not null and not anulada
     order by created_at asc limit 1),
    (select lpad(numero_comprobante::text, 8, '0') from facturas_emitidas
     where branch_id = p_branch_id and punto_venta = v_pv
       and date(created_at at time zone 'America/Argentina/Cordoba') = p_date
       and cae is not null and not anulada
     order by created_at asc limit 1),
    (select tipo_comprobante from facturas_emitidas
     where branch_id = p_branch_id and punto_venta = v_pv
       and date(created_at at time zone 'America/Argentina/Cordoba') = p_date
       and cae is not null and not anulada
     order by created_at desc limit 1),
    (select lpad(numero_comprobante::text, 8, '0') from facturas_emitidas
     where branch_id = p_branch_id and punto_venta = v_pv
       and date(created_at at time zone 'America/Argentina/Cordoba') = p_date
       and cae is not null and not anulada
     order by created_at desc limit 1),
    -- IVA breakdown from items_factura
    coalesce(sum(case when ifi.alicuota_iva = 21 and fe.tipo_comprobante not in ('NC_A','NC_B','NC_C')
      then ifi.precio_neto else 0 end), 0),
    coalesce(sum(case when ifi.alicuota_iva = 21 and fe.tipo_comprobante not in ('NC_A','NC_B','NC_C')
      then ifi.iva_monto else 0 end), 0),
    coalesce(sum(case when ifi.alicuota_iva = 10.5 and fe.tipo_comprobante not in ('NC_A','NC_B','NC_C')
      then ifi.precio_neto else 0 end), 0),
    coalesce(sum(case when ifi.alicuota_iva = 10.5 and fe.tipo_comprobante not in ('NC_A','NC_B','NC_C')
      then ifi.iva_monto else 0 end), 0),
    coalesce(sum(case when ifi.alicuota_iva = 0 and fe.tipo_comprobante not in ('NC_A','NC_B','NC_C')
      then ifi.precio_neto else 0 end), 0),
    0, -- non_taxable
    0, -- other_taxes
    -- Totals
    coalesce(sum(case when fe.tipo_comprobante not in ('NC_A','NC_B','NC_C') then fe.neto else 0 end), 0),
    coalesce(sum(case when fe.tipo_comprobante not in ('NC_A','NC_B','NC_C') then fe.iva else 0 end), 0),
    coalesce(sum(case when fe.tipo_comprobante not in ('NC_A','NC_B','NC_C') then fe.total else 0 end), 0),
    coalesce(sum(case when fe.tipo_comprobante in ('NC_A','NC_B','NC_C') then fe.total else 0 end), 0),
    coalesce(
      sum(case when fe.tipo_comprobante not in ('NC_A','NC_B','NC_C') then fe.total else 0 end) -
      sum(case when fe.tipo_comprobante in ('NC_A','NC_B','NC_C') then fe.total else 0 end),
    0),
    -- Payment methods from pedido_pagos
    coalesce((
      select sum(pp.monto) from pedido_pagos pp
      join pedidos p on p.id = pp.pedido_id
      where p.branch_id = p_branch_id
        and date(p.created_at at time zone 'America/Argentina/Cordoba') = p_date
        and p.estado != 'cancelado'
        and pp.metodo = 'efectivo'
    ), 0),
    coalesce((
      select sum(pp.monto) from pedido_pagos pp
      join pedidos p on p.id = pp.pedido_id
      where p.branch_id = p_branch_id
        and date(p.created_at at time zone 'America/Argentina/Cordoba') = p_date
        and p.estado != 'cancelado'
        and pp.metodo = 'tarjeta_debito'
    ), 0),
    coalesce((
      select sum(pp.monto) from pedido_pagos pp
      join pedidos p on p.id = pp.pedido_id
      where p.branch_id = p_branch_id
        and date(p.created_at at time zone 'America/Argentina/Cordoba') = p_date
        and p.estado != 'cancelado'
        and pp.metodo = 'tarjeta_credito'
    ), 0),
    coalesce((
      select sum(pp.monto) from pedido_pagos pp
      join pedidos p on p.id = pp.pedido_id
      where p.branch_id = p_branch_id
        and date(p.created_at at time zone 'America/Argentina/Cordoba') = p_date
        and p.estado != 'cancelado'
        and pp.metodo = 'mercadopago_qr'
    ), 0),
    coalesce((
      select sum(pp.monto) from pedido_pagos pp
      join pedidos p on p.id = pp.pedido_id
      where p.branch_id = p_branch_id
        and date(p.created_at at time zone 'America/Argentina/Cordoba') = p_date
        and p.estado != 'cancelado'
        and pp.metodo = 'transferencia'
    ), 0),
    auth.uid()
  from facturas_emitidas fe
  left join items_factura ifi on ifi.factura_id = fe.id
  where fe.branch_id = p_branch_id
    and fe.punto_venta = v_pv
    and date(fe.created_at at time zone 'America/Argentina/Cordoba') = p_date
    and fe.cae is not null
    and not fe.anulada
  returning * into v_result;

  return to_jsonb(v_result);
end;
$$;

-- ─── 4. FUNCTION: Get X Report (live, no persistence) ─────────────

create or replace function get_fiscal_x_report(
  p_branch_id uuid,
  p_date date default current_date
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_pv integer;
  v_result jsonb;
begin
  select punto_venta into v_pv
  from afip_config
  where branch_id = p_branch_id
  limit 1;

  if v_pv is null then
    raise exception 'No hay punto de venta configurado';
  end if;

  select jsonb_build_object(
    'punto_venta', v_pv,
    'fecha', p_date,
    'hora', to_char(now() at time zone 'America/Argentina/Cordoba', 'HH24:MI:SS'),
    'total_comprobantes', count(*) filter (where fe.tipo_comprobante not in ('NC_A','NC_B','NC_C')),
    'facturas_b', count(*) filter (where fe.tipo_comprobante = 'B'),
    'facturas_c', count(*) filter (where fe.tipo_comprobante = 'C'),
    'tickets', 0,
    'notas_credito_b', count(*) filter (where fe.tipo_comprobante = 'NC_B'),
    'notas_credito_c', count(*) filter (where fe.tipo_comprobante = 'NC_C'),
    'gravado_21', coalesce(sum(case when ifi.alicuota_iva = 21 and fe.tipo_comprobante not in ('NC_A','NC_B','NC_C') then ifi.precio_neto else 0 end), 0),
    'iva_21', coalesce(sum(case when ifi.alicuota_iva = 21 and fe.tipo_comprobante not in ('NC_A','NC_B','NC_C') then ifi.iva_monto else 0 end), 0),
    'gravado_105', coalesce(sum(case when ifi.alicuota_iva = 10.5 and fe.tipo_comprobante not in ('NC_A','NC_B','NC_C') then ifi.precio_neto else 0 end), 0),
    'iva_105', coalesce(sum(case when ifi.alicuota_iva = 10.5 and fe.tipo_comprobante not in ('NC_A','NC_B','NC_C') then ifi.iva_monto else 0 end), 0),
    'exento', coalesce(sum(case when ifi.alicuota_iva = 0 and fe.tipo_comprobante not in ('NC_A','NC_B','NC_C') then ifi.precio_neto else 0 end), 0),
    'no_gravado', 0,
    'subtotal_neto', coalesce(sum(case when fe.tipo_comprobante not in ('NC_A','NC_B','NC_C') then fe.neto else 0 end), 0),
    'total_iva', coalesce(sum(case when fe.tipo_comprobante not in ('NC_A','NC_B','NC_C') then fe.iva else 0 end), 0),
    'total_ventas', coalesce(sum(case when fe.tipo_comprobante not in ('NC_A','NC_B','NC_C') then fe.total else 0 end), 0),
    'total_nc', coalesce(sum(case when fe.tipo_comprobante in ('NC_A','NC_B','NC_C') then fe.total else 0 end), 0),
    'neto_ventas_nc', coalesce(
      sum(case when fe.tipo_comprobante not in ('NC_A','NC_B','NC_C') then fe.total else 0 end) -
      sum(case when fe.tipo_comprobante in ('NC_A','NC_B','NC_C') then fe.total else 0 end), 0),
    'ultimo_comprobante', (
      select fe2.tipo_comprobante || '-' || lpad(fe2.punto_venta::text, 5, '0') || '-' || lpad(fe2.numero_comprobante::text, 8, '0')
      from facturas_emitidas fe2
      where fe2.branch_id = p_branch_id and fe2.punto_venta = v_pv
        and date(fe2.created_at at time zone 'America/Argentina/Cordoba') = p_date
        and fe2.cae is not null and not fe2.anulada
      order by fe2.created_at desc limit 1
    ),
    'pago_efectivo', coalesce((
      select sum(pp.monto) from pedido_pagos pp
      join pedidos p on p.id = pp.pedido_id
      where p.branch_id = p_branch_id
        and date(p.created_at at time zone 'America/Argentina/Cordoba') = p_date
        and p.estado != 'cancelado' and pp.metodo = 'efectivo'
    ), 0),
    'pago_debito', coalesce((
      select sum(pp.monto) from pedido_pagos pp
      join pedidos p on p.id = pp.pedido_id
      where p.branch_id = p_branch_id
        and date(p.created_at at time zone 'America/Argentina/Cordoba') = p_date
        and p.estado != 'cancelado' and pp.metodo = 'tarjeta_debito'
    ), 0),
    'pago_credito', coalesce((
      select sum(pp.monto) from pedido_pagos pp
      join pedidos p on p.id = pp.pedido_id
      where p.branch_id = p_branch_id
        and date(p.created_at at time zone 'America/Argentina/Cordoba') = p_date
        and p.estado != 'cancelado' and pp.metodo = 'tarjeta_credito'
    ), 0),
    'pago_qr', coalesce((
      select sum(pp.monto) from pedido_pagos pp
      join pedidos p on p.id = pp.pedido_id
      where p.branch_id = p_branch_id
        and date(p.created_at at time zone 'America/Argentina/Cordoba') = p_date
        and p.estado != 'cancelado' and pp.metodo = 'mercadopago_qr'
    ), 0),
    'pago_transferencia', coalesce((
      select sum(pp.monto) from pedido_pagos pp
      join pedidos p on p.id = pp.pedido_id
      where p.branch_id = p_branch_id
        and date(p.created_at at time zone 'America/Argentina/Cordoba') = p_date
        and p.estado != 'cancelado' and pp.metodo = 'transferencia'
    ), 0)
  ) into v_result
  from facturas_emitidas fe
  left join items_factura ifi on ifi.factura_id = fe.id
  where fe.branch_id = p_branch_id
    and fe.punto_venta = v_pv
    and date(fe.created_at at time zone 'America/Argentina/Cordoba') = p_date
    and fe.cae is not null
    and not fe.anulada;

  return v_result;
end;
$$;

-- ─── 5. FUNCTION: Get Audit Report ────────────────────────────────

create or replace function get_fiscal_audit_report(
  p_branch_id uuid,
  p_from_date date default null,
  p_to_date date default null,
  p_from_z integer default null,
  p_to_z integer default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_pv integer;
  v_result jsonb;
begin
  select punto_venta into v_pv
  from afip_config
  where branch_id = p_branch_id
  limit 1;

  if v_pv is null then
    raise exception 'No hay punto de venta configurado';
  end if;

  with filtered as (
    select *
    from fiscal_z_closings
    where branch_id = p_branch_id
      and pos_point_of_sale = v_pv
      and (p_from_date is null or date >= p_from_date)
      and (p_to_date is null or date <= p_to_date)
      and (p_from_z is null or z_number >= p_from_z)
      and (p_to_z is null or z_number <= p_to_z)
    order by z_number asc
  )
  select jsonb_build_object(
    'punto_venta', v_pv,
    'desde_fecha', min(f.date),
    'hasta_fecha', max(f.date),
    'desde_z', min(f.z_number),
    'hasta_z', max(f.z_number),
    'cantidad_jornadas', count(*),
    'jornadas', jsonb_agg(jsonb_build_object(
      'fecha', f.date,
      'z_number', f.z_number,
      'total_sales', f.total_sales,
      'net_total', f.net_total,
      'total_credit_notes_amount', f.total_credit_notes_amount
    ) order by f.z_number),
    'total_comprobantes', sum(f.total_invoices),
    'total_ventas_brutas', sum(f.total_sales),
    'total_nc', sum(f.total_credit_notes_amount),
    'total_neto', sum(f.net_total),
    'total_iva_21', sum(f.vat_21),
    'total_iva_105', sum(f.vat_105)
  ) into v_result
  from filtered f;

  return v_result;
end;
$$;

-- ─── 6. WEBAPP SERVICE SCHEDULES ──────────────────────────────────

alter table webapp_config
  add column if not exists service_schedules jsonb default '{}',
  add column if not exists prep_time_retiro integer default 15,
  add column if not exists prep_time_delivery integer default 40,
  add column if not exists prep_time_comer_aca integer default 15,
  add column if not exists auto_accept_orders boolean default false,
  add column if not exists auto_print_orders boolean default false;

-- ─── 7. ENHANCED EXPENSE TRACKING ────────────────────────────────

alter table gastos
  add column if not exists tipo_pago text default 'efectivo_caja',
  add column if not exists afecta_caja boolean default true,
  add column if not exists costo_transferencia numeric(12,2) default 0,
  add column if not exists shift_id uuid references cash_register_shifts(id),
  add column if not exists rdo_section text;

-- ─── 8. CASH REGISTER CLOSING REPORT FIELDS ──────────────────────

alter table cash_register_shifts
  add column if not exists closing_report jsonb,
  add column if not exists printed_at timestamptz;

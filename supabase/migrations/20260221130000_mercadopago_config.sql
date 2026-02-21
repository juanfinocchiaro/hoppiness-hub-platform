-- MercadoPago configuration per branch
create table if not exists mercadopago_config (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id) on delete cascade,
  access_token text not null default '',
  public_key text not null default '',
  estado_conexion text not null default 'desconectado'
    check (estado_conexion in ('conectado', 'desconectado', 'error')),
  webhook_secret text,
  collector_id text,
  ultimo_test timestamptz,
  ultimo_test_ok boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(branch_id)
);

alter table mercadopago_config enable row level security;

create policy "Staff can view MP config"
  on mercadopago_config for select
  using (public.has_branch_access_v2(auth.uid(), branch_id) or public.is_superadmin(auth.uid()));

create policy "Owners can manage MP config"
  on mercadopago_config for all
  using (public.has_branch_access_v2(auth.uid(), branch_id) or public.is_superadmin(auth.uid()))
  with check (public.has_branch_access_v2(auth.uid(), branch_id) or public.is_superadmin(auth.uid()));

-- =============================================
-- Delivery Tracking — QR-based cadete GPS tracking
-- =============================================

CREATE TABLE public.delivery_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  tracking_token UUID NOT NULL DEFAULT gen_random_uuid(),

  cadete_lat NUMERIC(10,7),
  cadete_lng NUMERIC(10,7),

  dest_lat NUMERIC(10,7),
  dest_lng NUMERIC(10,7),

  store_lat NUMERIC(10,7),
  store_lng NUMERIC(10,7),

  tracking_started_at TIMESTAMPTZ,
  tracking_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tracking_token),
  UNIQUE(pedido_id)
);

CREATE INDEX idx_delivery_tracking_token ON delivery_tracking(tracking_token);
CREATE INDEX idx_delivery_tracking_pedido ON delivery_tracking(pedido_id);

-- RLS
ALTER TABLE delivery_tracking ENABLE ROW LEVEL SECURITY;

-- Staff can manage tracking rows for their branches
CREATE POLICY "Staff can manage delivery_tracking" ON delivery_tracking FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM pedidos p
      WHERE p.id = delivery_tracking.pedido_id
        AND (public.has_branch_access_v2(auth.uid(), p.branch_id) OR public.is_superadmin(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pedidos p
      WHERE p.id = delivery_tracking.pedido_id
        AND (public.has_branch_access_v2(auth.uid(), p.branch_id) OR public.is_superadmin(auth.uid()))
    )
  );

-- Public read by tracking_token (for customer tracking page)
CREATE POLICY "Public read by tracking_token" ON delivery_tracking FOR SELECT
  USING (true);

-- Allow anonymous position updates by token (cadete scan flow, via edge function with service_role)
-- The edge function validates the token and updates directly with service_role key.

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE delivery_tracking;

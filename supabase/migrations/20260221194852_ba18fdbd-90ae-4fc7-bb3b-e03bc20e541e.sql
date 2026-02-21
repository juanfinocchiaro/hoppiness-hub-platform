
-- Table for live chat messages between client and branch during active orders
CREATE TABLE public.webapp_pedido_mensajes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id),
  sender_type text NOT NULL CHECK (sender_type IN ('cliente', 'local')),
  sender_id uuid,
  sender_nombre text NOT NULL,
  mensaje text NOT NULL CHECK (char_length(mensaje) <= 500),
  leido boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_wpm_pedido ON webapp_pedido_mensajes(pedido_id, created_at);
CREATE INDEX idx_wpm_branch_unread ON webapp_pedido_mensajes(branch_id, leido, created_at DESC);

-- RLS
ALTER TABLE webapp_pedido_mensajes ENABLE ROW LEVEL SECURITY;

-- Branch staff can read all messages for their branch
CREATE POLICY "Branch staff reads chat messages"
  ON webapp_pedido_mensajes FOR SELECT
  USING (can_access_branch(auth.uid(), branch_id));

-- Branch staff can send messages as 'local'
CREATE POLICY "Branch staff sends chat messages"
  ON webapp_pedido_mensajes FOR INSERT
  WITH CHECK (
    sender_type = 'local'
    AND can_access_branch(auth.uid(), branch_id)
  );

-- Branch staff can mark messages as read
CREATE POLICY "Branch staff marks messages read"
  ON webapp_pedido_mensajes FOR UPDATE
  USING (can_access_branch(auth.uid(), branch_id))
  WITH CHECK (can_access_branch(auth.uid(), branch_id));

-- Authenticated clients can read their own order's messages
CREATE POLICY "Clients read own order chat"
  ON webapp_pedido_mensajes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pedidos
      WHERE pedidos.id = webapp_pedido_mensajes.pedido_id
      AND pedidos.cliente_user_id = auth.uid()
    )
  );

-- Authenticated clients can send messages as 'cliente'
CREATE POLICY "Clients send own order chat"
  ON webapp_pedido_mensajes FOR INSERT
  WITH CHECK (
    sender_type = 'cliente'
    AND EXISTS (
      SELECT 1 FROM pedidos
      WHERE pedidos.id = webapp_pedido_mensajes.pedido_id
      AND pedidos.cliente_user_id = auth.uid()
    )
  );

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE webapp_pedido_mensajes;

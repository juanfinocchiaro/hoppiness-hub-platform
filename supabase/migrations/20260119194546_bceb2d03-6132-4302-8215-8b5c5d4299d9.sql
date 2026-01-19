-- Add new delivery-related statuses to the order_status enum
ALTER TYPE order_status ADD VALUE 'waiting_pickup' AFTER 'ready';
ALTER TYPE order_status ADD VALUE 'in_transit' AFTER 'waiting_pickup';
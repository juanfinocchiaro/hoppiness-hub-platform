import type { BrandRole, LocalRole } from '@/hooks/usePermissionsV2';

export interface UserWithStats {
  id: string;
  user_id: string | null; // auth.users id - needed for user_roles_v2
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  loyalty_points: number;
  internal_notes: NoteEntry[];
  brand_role: BrandRole;
  local_role: LocalRole;
  branch_ids: string[];
  role_id: string | null;
  total_orders: number;
  total_spent: number;
  last_order_date: string | null;
}

export interface NoteEntry {
  date: string;
  note: string;
  by: string;
  by_name?: string;
}

export interface UserAddress {
  id: string;
  label: string | null;
  street: string;
  city: string;
  postal_code: string | null;
}

export interface RecentOrder {
  id: string;
  order_number: number;
  total: number;
  created_at: string;
  items: OrderItemSummary[];
}

export interface OrderItemSummary {
  name: string;
  quantity: number;
}

export interface Branch {
  id: string;
  name: string;
}

// Role priority for display (higher = more important)
export const ROLE_PRIORITY: Record<string, number> = {
  superadmin: 100,
  coordinador: 90,
  contador_marca: 80,
  informes: 70,
  franquiciado: 60,
  encargado: 50,
  contador_local: 40,
  cajero: 30,
  empleado: 20,
};

export const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Superadmin',
  coordinador: 'Coordinador',
  contador_marca: 'Contador Marca',
  informes: 'Informes',
  franquiciado: 'Franquiciado',
  encargado: 'Encargado',
  contador_local: 'Contador Local',
  cajero: 'Cajero',
  empleado: 'Empleado',
};

export function getHighestRole(brandRole: BrandRole, localRole: LocalRole): string {
  const brandPriority = brandRole ? ROLE_PRIORITY[brandRole] || 0 : 0;
  const localPriority = localRole ? ROLE_PRIORITY[localRole] || 0 : 0;
  
  if (brandPriority >= localPriority && brandRole) return brandRole;
  if (localRole) return localRole;
  return 'cliente';
}

export function formatMoney(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(1)}k`;
  }
  return `$${amount.toFixed(0)}`;
}

export function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `Hace ${weeks} sem.`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `Hace ${months} mes${months > 1 ? 'es' : ''}`;
  }
  const years = Math.floor(diffDays / 365);
  return `Hace ${years} año${years > 1 ? 's' : ''}`;
}

export function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-AR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: '2-digit' 
  });
}

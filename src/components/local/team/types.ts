import type { LocalRole } from '@/hooks/usePermissionsV2';

export interface TeamMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  local_role: LocalRole;
  hire_date: string;
  hours_this_month: number;
  monthly_hours_target: number;
  last_clock_in: string | null;
  is_working: boolean;
  active_warnings: number;
  role_id: string;
}

export interface EmployeeData {
  id: string;
  user_id: string;
  branch_id: string;
  dni: string | null;
  birth_date: string | null;
  personal_address: string | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
  bank_name: string | null;
  cbu: string | null;
  alias: string | null;
  cuil: string | null;
  hire_date: string | null;
  monthly_hours_target: number;
  internal_notes: NoteEntry[];
}

export interface Warning {
  id: string;
  user_id: string;
  branch_id: string;
  warning_type: 'late_arrival' | 'absence' | 'misconduct' | 'uniform' | 'other';
  description: string;
  warning_date: string;
  issued_by: string | null;
  issued_by_name?: string;
  is_active: boolean;
  created_at: string;
}

export interface NoteEntry {
  date: string;
  note: string;
  by: string;
  by_name?: string;
}

export const LOCAL_ROLE_LABELS: Record<string, string> = {
  franquiciado: 'Franquiciado',
  encargado: 'Encargado',
  contador_local: 'Contador Local',
  cajero: 'Cajero',
  empleado: 'Empleado',
};

export const WARNING_TYPE_LABELS: Record<string, string> = {
  late_arrival: 'Llegada tarde',
  absence: 'Falta',
  misconduct: 'Mala conducta',
  uniform: 'Uniforme',
  other: 'Otro',
};

export function formatHours(hours: number): string {
  return `${Math.round(hours)}h`;
}

export function formatClockIn(dateStr: string | null): string {
  if (!dateStr) return '-';
  
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  
  const time = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  
  if (isToday) return `Hoy ${time}`;
  if (isYesterday) return `Ayer ${time}`;
  
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  return `Hace ${diffDays} días`;
}

export function calculateAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

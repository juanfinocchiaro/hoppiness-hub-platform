/**
 * Tipos para el módulo de Reuniones
 */

// Áreas disponibles para reuniones
export const MEETING_AREAS = [
  { value: 'general', label: 'General' },
  { value: 'cocina', label: 'Cocina' },
  { value: 'salon', label: 'Salón' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'caja', label: 'Caja' },
] as const;

export type MeetingArea = typeof MEETING_AREAS[number]['value'];

// Meeting base
export interface Meeting {
  id: string;
  title: string;
  date: string;
  area: MeetingArea;
  branch_id: string;
  created_by: string;
  status: 'closed';
  notes: string;
  created_at: string;
  updated_at?: string;
}

// Participant
export interface MeetingParticipant {
  id: string;
  meeting_id: string;
  user_id: string;
  attended: boolean;
  read_at: string | null;
  created_at: string;
}

// Agreement
export interface MeetingAgreement {
  id: string;
  meeting_id: string;
  description: string;
  sort_order: number;
  created_at: string;
}

// Agreement Assignee
export interface MeetingAgreementAssignee {
  id: string;
  agreement_id: string;
  user_id: string;
}

// Extended types with relations
export interface MeetingWithDetails extends Meeting {
  participants: (MeetingParticipant & {
    profile?: {
      id: string;
      full_name: string;
      avatar_url?: string;
    };
  })[];
  agreements: (MeetingAgreement & {
    assignees: (MeetingAgreementAssignee & {
      profile?: {
        id: string;
        full_name: string;
        avatar_url?: string;
      };
    })[];
  })[];
  creator?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

// Form data for wizard
export interface MeetingWizardData {
  // Step 1 - Basic info
  title: string;
  date: Date;
  time: string;
  area: MeetingArea;
  participantIds: string[];
  
  // Step 2 - Attendance & Notes
  attendance: Record<string, boolean>; // userId -> attended
  notes: string;
  
  // Step 3 - Agreements
  agreements: {
    description: string;
    assigneeIds: string[];
  }[];
}

// Stats for dashboard
export interface MeetingStats {
  totalMeetings: number;
  unreadCount: number;
  lastMeetingDate?: string;
}

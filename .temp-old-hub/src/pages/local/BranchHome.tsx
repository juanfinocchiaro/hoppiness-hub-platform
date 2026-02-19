/**
 * BranchHome - Redirects to ManagerDashboard
 * This file is kept for backwards compatibility
 */
import { ManagerDashboard } from '@/components/local/ManagerDashboard';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

interface BranchHomeProps {
  branch: Branch;
}

export default function BranchHome({ branch }: BranchHomeProps) {
  return <ManagerDashboard branch={branch} />;
}

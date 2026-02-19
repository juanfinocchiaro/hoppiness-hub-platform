import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { devLog } from '@/lib/errorHandler';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

interface PanelAccessData {
  // Panel modes
  canUseLocalPanel: boolean;
  canUseBrandPanel: boolean;
  
  // Scope
  brandAccess: boolean;
  branchAccess: Branch[];
  
  // Loading
  loading: boolean;
  
  // Helpers
  hasPanelAccess: boolean;
  hasAnyBranchAccess: boolean;
}

export function usePanelAccess(): PanelAccessData {
  const { user } = useAuth();
  const [canUseLocalPanel, setCanUseLocalPanel] = useState(false);
  const [canUseBrandPanel, setCanUseBrandPanel] = useState(false);
  const [brandAccess, setBrandAccess] = useState(false);
  const [branchAccess, setBranchAccess] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPanelAccess() {
      if (!user) {
        setCanUseLocalPanel(false);
        setCanUseBrandPanel(false);
        setBrandAccess(false);
        setBranchAccess([]);
        setLoading(false);
        return;
      }

      try {
        // Fetch panel access flags
        const { data: panelData, error: panelError } = await supabase
          .from('user_panel_access')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (panelError) {
          devLog('Error fetching panel access', panelError);
        }

        // Check if user is admin (admins have full access)
        const { data: adminRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        const isAdmin = !!adminRole;

        if (isAdmin) {
          // Admins have full access
          setCanUseLocalPanel(true);
          setCanUseBrandPanel(true);
          setBrandAccess(true);
          
          // Admin can access all branches
          const { data: allBranches } = await supabase
            .from('branches')
            .select('*')
            .order('name');
          
          setBranchAccess(allBranches || []);
        } else if (panelData) {
          setCanUseLocalPanel(panelData.can_use_local_panel);
          setCanUseBrandPanel(panelData.can_use_brand_panel);
          setBrandAccess(panelData.brand_access);
          
          // Fetch branch access
          const { data: branchAccessData, error: branchError } = await supabase
            .from('user_branch_access')
            .select('branch_id')
            .eq('user_id', user.id);

          if (branchError) {
            devLog('Error fetching branch access', branchError);
          }

          if (branchAccessData && branchAccessData.length > 0) {
            const branchIds = branchAccessData.map(ba => ba.branch_id);
            const { data: branches } = await supabase
              .from('branches')
              .select('*')
              .in('id', branchIds)
              .order('name');
            
            setBranchAccess(branches || []);
          } else {
            setBranchAccess([]);
          }
        } else {
          // No panel access record found
          setCanUseLocalPanel(false);
          setCanUseBrandPanel(false);
          setBrandAccess(false);
          setBranchAccess([]);
        }
      } catch (error) {
        devLog('Error in usePanelAccess', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPanelAccess();
  }, [user]);

  return {
    canUseLocalPanel,
    canUseBrandPanel,
    brandAccess,
    branchAccess,
    loading,
    hasPanelAccess: canUseLocalPanel || canUseBrandPanel,
    hasAnyBranchAccess: branchAccess.length > 0,
  };
}

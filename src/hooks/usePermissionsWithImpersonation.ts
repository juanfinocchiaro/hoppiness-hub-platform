/**
 * usePermissionsWithImpersonation - Wrapper de usePermissionsV2 con soporte para impersonación
 * 
 * SIMPLIFICADO: Ahora usa useDynamicPermissions como base para evitar duplicación de lógica.
 * Cuando hay impersonación activa, retorna los permisos del usuario impersonado.
 * Las operaciones de DB siguen usando auth.uid() real.
 */
import { useMemo } from 'react';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useDynamicPermissions, type DynamicPermissions } from './useDynamicPermissions';
import type { Tables } from '@/integrations/supabase/types';
import type { BrandRole, LocalRole, UserBranchRole } from './usePermissionsV2';

type Branch = Tables<'branches'>;

export function usePermissionsWithImpersonation(currentBranchId?: string): DynamicPermissions & { 
  isViewingAs: boolean;
  realUserPermissions: DynamicPermissions | null;
} {
  const realPermissions = useDynamicPermissions(currentBranchId);
  const { isImpersonating, targetUser } = useImpersonation();

  // Calculate impersonated permissions
  const impersonatedPermissions = useMemo((): DynamicPermissions | null => {
    if (!isImpersonating || !targetUser) return null;

    const brandRole = targetUser.brandRole;
    const branchRoles = targetUser.branchRoles;
    const accessibleBranches = targetUser.accessibleBranches;

    // Get local role for current branch
    const getLocalRoleForBranch = (branchId: string): LocalRole => {
      const role = branchRoles.find(r => r.branch_id === branchId);
      return role?.local_role || null;
    };

    const localRole = currentBranchId ? getLocalRoleForBranch(currentBranchId) : null;

    // Role helpers
    const isSuperadmin = brandRole === 'superadmin';
    const isCoordinador = brandRole === 'coordinador';
    const isInformes = brandRole === 'informes';
    const isContadorMarca = brandRole === 'contador_marca';
    const isFranquiciado = localRole === 'franquiciado';
    const isEncargado = localRole === 'encargado';
    const isContadorLocal = localRole === 'contador_local';
    const isCajero = localRole === 'cajero';
    const isEmpleado = localRole === 'empleado';

    const canAccessBrandPanel = !!brandRole;
    const canAccessLocalPanel = branchRoles.length > 0;

    const hasAccessToBranch = (branchId: string): boolean => {
      if (isSuperadmin) return true;
      return branchRoles.some(r => r.branch_id === branchId);
    };

    const canApproveWithPin = isFranquiciado || isEncargado;
    const hasCurrentBranchAccess = currentBranchId ? hasAccessToBranch(currentBranchId) : false;

    // Use real permissions structure as base (avoid duplicating all permission logic)
    // Just override the role-based checks
    return {
      loading: false,
      loadingConfig: false,
      error: null,
      brandRole,
      localRole,
      branchRoles,
      accessibleBranches,
      isSuperadmin,
      isCoordinador,
      isInformes,
      isContadorMarca,
      isFranquiciado,
      isEncargado,
      isContadorLocal,
      isCajero,
      isEmpleado,
      canAccessBrandPanel,
      canAccessLocalPanel,
      hasAccessToBranch,
      getLocalRoleForBranch,
      canApproveWithPin,
      // Use real permissions structure but apply impersonated role checks
      brand: {
        canViewDashboard: !!brandRole,
        canViewPnL: isSuperadmin || isInformes || isContadorMarca,
        canViewComparativa: isSuperadmin || isInformes || isContadorMarca,
        canViewHoursSummary: isSuperadmin || isInformes || isContadorMarca,
        canViewLocales: !!brandRole,
        canCreateLocales: isSuperadmin,
        canViewProducts: isSuperadmin || isCoordinador,
        canEditProducts: isSuperadmin || isCoordinador,
        canManageModifiers: isSuperadmin || isCoordinador,
        canManageIngredients: isSuperadmin || isCoordinador,
        canEditPrices: isSuperadmin || isCoordinador,
        canManagePromotions: isSuperadmin || isCoordinador,
        canViewInsumos: isSuperadmin || isCoordinador || isContadorMarca,
        canEditInsumos: isSuperadmin || isCoordinador,
        canViewConceptosServicio: isSuperadmin || isCoordinador || isContadorMarca,
        canEditConceptosServicio: isSuperadmin || isCoordinador,
        canViewProveedoresMarca: isSuperadmin || isCoordinador || isContadorMarca,
        canEditProveedoresMarca: isSuperadmin || isCoordinador,
        canViewVentasMensuales: isSuperadmin || isInformes || isContadorMarca,
        canEditVentasMensuales: isSuperadmin || isContadorMarca,
        canViewCanon: isSuperadmin || isContadorMarca,
        canEditCanon: isSuperadmin || isContadorMarca,
        canManageSuppliers: isSuperadmin,
        canManageCentralTeam: isSuperadmin,
        canViewCentralTeam: isSuperadmin || isCoordinador,
        canSearchUsers: isSuperadmin,
        canAssignRoles: isSuperadmin,
        canManageMessages: isSuperadmin || isCoordinador,
        canViewContactMessages: isSuperadmin || isCoordinador,
        canManageContactMessages: isSuperadmin || isCoordinador,
        canCoachManagers: isSuperadmin || isCoordinador,
        canViewCoaching: isSuperadmin || isCoordinador,
        canViewMeetings: isSuperadmin || isCoordinador,
        canCreateMeetings: isSuperadmin || isCoordinador,
        canEditBrandConfig: isSuperadmin,
        canManageChannels: isSuperadmin || isCoordinador,
        canManageIntegrations: isSuperadmin,
      },
      local: {
        canViewDashboard: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isFranquiciado || isCajero || isContadorLocal),
        canViewStock: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isFranquiciado),
        canOrderFromSupplier: hasCurrentBranchAccess && (isSuperadmin || isEncargado),
        canDoInventoryCount: hasCurrentBranchAccess && (isSuperadmin || isEncargado),
        canUploadInvoice: hasCurrentBranchAccess && (isSuperadmin || isContadorLocal || isEncargado),
        canViewSuppliers: hasCurrentBranchAccess && (isSuperadmin || isContadorLocal || isEncargado || isFranquiciado),
        canViewSupplierAccounts: hasCurrentBranchAccess && (isSuperadmin || isContadorLocal || isEncargado || isFranquiciado),
        canPaySupplier: hasCurrentBranchAccess && (isSuperadmin || isContadorLocal),
        canViewPurchaseHistory: hasCurrentBranchAccess && (isSuperadmin || isContadorLocal || isEncargado || isFranquiciado),
        canClockInOut: hasCurrentBranchAccess && (isSuperadmin || !!localRole),
        canViewAllClockIns: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isFranquiciado || isContadorLocal),
        canViewTeam: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isFranquiciado),
        canEditSchedules: hasCurrentBranchAccess && (isSuperadmin || isEncargado),
        canViewMonthlyHours: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isFranquiciado || isContadorLocal),
        canViewPayroll: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isFranquiciado || isContadorLocal),
        canInviteEmployees: hasCurrentBranchAccess && (isSuperadmin || isEncargado),
        canDeactivateEmployees: hasCurrentBranchAccess && (isSuperadmin || isEncargado),
        canViewSalaryAdvances: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isFranquiciado || isContadorLocal),
        canViewWarnings: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isFranquiciado || isContadorLocal),
        canCreateSalaryAdvance: hasCurrentBranchAccess && (isSuperadmin || isEncargado),
        canCancelSalaryAdvance: hasCurrentBranchAccess && (isSuperadmin || isEncargado),
        canCreateWarning: hasCurrentBranchAccess && (isSuperadmin || isEncargado),
        canUploadSignature: hasCurrentBranchAccess && (isSuperadmin || isEncargado),
        canDoCoaching: hasCurrentBranchAccess && (isSuperadmin || isEncargado),
        canViewCoaching: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isFranquiciado),
        canSendLocalCommunication: hasCurrentBranchAccess && (isSuperadmin || isEncargado),
        canViewLocalCommunications: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isFranquiciado || isContadorLocal),
        canViewMeetings: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isFranquiciado || isCajero || isEmpleado),
        canCreateMeetings: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isFranquiciado),
        canCloseMeetings: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isFranquiciado),
        canViewClosures: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isFranquiciado || isCajero),
        canCloseShifts: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isCajero),
        canAccessPOS: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isCajero),
        canViewKitchen: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isCajero),
        canAssignDelivery: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isCajero),
        canOpenRegister: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isCajero),
        canCloseRegister: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isCajero),
        canViewSalesReports: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isFranquiciado),
        canViewLocalPnL: hasCurrentBranchAccess && (isSuperadmin || isContadorLocal || isFranquiciado),
        canViewCMV: hasCurrentBranchAccess && (isSuperadmin || isFranquiciado),
        canViewStockMovements: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isFranquiciado),
        canViewGastos: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isFranquiciado || isContadorLocal),
        canCreateGastos: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isContadorLocal),
        canViewConsumos: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isFranquiciado || isContadorLocal),
        canCreateConsumos: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isContadorLocal),
        canViewPeriodos: hasCurrentBranchAccess && (isSuperadmin || isFranquiciado || isContadorLocal),
        canEditPeriodos: hasCurrentBranchAccess && (isSuperadmin || isFranquiciado || isContadorLocal),
        canViewVentasMensualesLocal: hasCurrentBranchAccess && (isSuperadmin || isFranquiciado || isContadorLocal),
        canEditVentasMensualesLocal: hasCurrentBranchAccess && (isSuperadmin || isFranquiciado || isContadorLocal),
        canViewSocios: hasCurrentBranchAccess && (isSuperadmin || isFranquiciado),
        canEditSocios: hasCurrentBranchAccess && (isSuperadmin || isFranquiciado),
        canEditLocalConfig: hasCurrentBranchAccess && (isSuperadmin || isFranquiciado),
        canConfigPrinters: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isFranquiciado),
        canConfigShifts: hasCurrentBranchAccess && (isSuperadmin || isFranquiciado),
        canEnterSales: hasCurrentBranchAccess && (isSuperadmin || isEncargado || isCajero),
      },
      refetch: () => {},
    };
  }, [isImpersonating, targetUser, currentBranchId]);

  // Return impersonated permissions if active, otherwise real permissions
  if (isImpersonating && impersonatedPermissions) {
    return {
      ...impersonatedPermissions,
      isViewingAs: true,
      realUserPermissions: realPermissions,
    };
  }

  return {
    ...realPermissions,
    isViewingAs: false,
    realUserPermissions: null,
  };
}

export default usePermissionsWithImpersonation;

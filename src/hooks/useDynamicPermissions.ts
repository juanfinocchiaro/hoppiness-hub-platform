/**
 * useDynamicPermissions - Hook combinado que usa permission_config como override
 * 
 * Combina:
 * 1. usePermissionsV2 (roles y permisos hardcodeados)
 * 2. usePermissionOverrides (configuración dinámica de permission_config)
 * 
 * La lógica:
 * - Si existe una configuración en permission_config → usa esa
 * - Si no existe → usa el fallback hardcodeado de usePermissionsV2
 */
import { useMemo } from 'react';
import { usePermissionsV2, type PermissionsV2 } from './usePermissionsV2';
import { usePermissionOverrides } from './usePermissionOverrides';

export interface DynamicPermissions extends PermissionsV2 {
  /** Indica si los permisos dinámicos están cargando */
  loadingConfig: boolean;
}

export function useDynamicPermissions(currentBranchId?: string): DynamicPermissions {
  const permissions = usePermissionsV2(currentBranchId);
  const { getPermission, isLoading: loadingConfig } = usePermissionOverrides();

  // Calcular permisos de marca con overrides
  const dynamicBrandPermissions = useMemo(() => {
    const { brandRole, isSuperadmin } = permissions;
    
    // Superadmin siempre tiene todos los permisos (no configurable)
    if (isSuperadmin) {
      return permissions.brand;
    }

    return {
      // Dashboard
      canViewDashboard: getPermission('brand.viewDashboard', brandRole, permissions.brand.canViewDashboard),
      canViewPnL: getPermission('brand.viewPnL', brandRole, permissions.brand.canViewPnL),
      canViewComparativa: getPermission('brand.viewComparativa', brandRole, permissions.brand.canViewComparativa),
      canViewHoursSummary: getPermission('brand.viewHoursSummary', brandRole, permissions.brand.canViewHoursSummary),
      
      // Locales
      canViewLocales: getPermission('brand.viewBranches', brandRole, permissions.brand.canViewLocales),
      canCreateLocales: getPermission('brand.createBranches', brandRole, permissions.brand.canCreateLocales),
      
      // Catálogos Marca
      canViewProducts: getPermission('brand.viewProducts', brandRole, permissions.brand.canViewProducts),
      canEditProducts: getPermission('brand.editProducts', brandRole, permissions.brand.canEditProducts),
      canManageModifiers: permissions.brand.canManageModifiers,
      canManageIngredients: permissions.brand.canManageIngredients,
      canEditPrices: permissions.brand.canEditPrices,
      canManagePromotions: permissions.brand.canManagePromotions,
      canViewInsumos: getPermission('brand.viewInsumos', brandRole, permissions.brand.canViewInsumos),
      canEditInsumos: getPermission('brand.editInsumos', brandRole, permissions.brand.canEditInsumos),
      canViewConceptosServicio: getPermission('brand.viewConceptosServicio', brandRole, permissions.brand.canViewConceptosServicio),
      canEditConceptosServicio: getPermission('brand.editConceptosServicio', brandRole, permissions.brand.canEditConceptosServicio),
      canViewProveedoresMarca: getPermission('brand.viewProveedoresMarca', brandRole, permissions.brand.canViewProveedoresMarca),
      canEditProveedoresMarca: getPermission('brand.editProveedoresMarca', brandRole, permissions.brand.canEditProveedoresMarca),
      
      // Finanzas Marca
      canViewVentasMensuales: getPermission('brand.viewVentasMensuales', brandRole, permissions.brand.canViewVentasMensuales),
      canEditVentasMensuales: getPermission('brand.editVentasMensuales', brandRole, permissions.brand.canEditVentasMensuales),
      canViewCanon: getPermission('brand.viewCanon', brandRole, permissions.brand.canViewCanon),
      canEditCanon: getPermission('brand.editCanon', brandRole, permissions.brand.canEditCanon),
      
      // Proveedores (legacy)
      canManageSuppliers: permissions.brand.canManageSuppliers,
      
      // Equipo
      canManageCentralTeam: getPermission('brand.editCentralTeam', brandRole, permissions.brand.canManageCentralTeam),
      canViewCentralTeam: getPermission('brand.viewCentralTeam', brandRole, permissions.brand.canViewCentralTeam),
      canSearchUsers: getPermission('brand.viewUsers', brandRole, permissions.brand.canSearchUsers),
      canAssignRoles: getPermission('brand.assignRoles', brandRole, permissions.brand.canAssignRoles),
      
      // Comunicación
      canManageMessages: getPermission('brand.createCommunications', brandRole, permissions.brand.canManageMessages),
      canViewContactMessages: getPermission('brand.viewContactMessages', brandRole, permissions.brand.canViewContactMessages),
      canManageContactMessages: getPermission('brand.manageContactMessages', brandRole, permissions.brand.canManageContactMessages),
      
      // Coaching
      canCoachManagers: getPermission('brand.coachManagers', brandRole, false),
      canViewCoaching: getPermission('brand.viewCoaching', brandRole, false),
      
      // Reuniones
      canViewMeetings: getPermission('brand.viewMeetings', brandRole, false),
      canCreateMeetings: getPermission('brand.createMeetings', brandRole, false),
      
      // Delivery
      canManageDeliveryPricing: permissions.brand.canManageDeliveryPricing,
      canManageDeliveryZones: permissions.brand.canManageDeliveryZones,

      // Configuración
      canEditBrandConfig: getPermission('brand.editConfig', brandRole, permissions.brand.canEditBrandConfig),
      canManageChannels: permissions.brand.canManageChannels,
      canManageIntegrations: permissions.brand.canManageIntegrations,
    };
  }, [permissions, getPermission]);

  // Calcular permisos locales con overrides
  const dynamicLocalPermissions = useMemo(() => {
    const { localRole, isSuperadmin, hasAccessToBranch } = permissions;
    
    // Superadmin siempre tiene todos los permisos
    if (isSuperadmin) {
      return permissions.local;
    }

    // Si no tiene acceso a la sucursal actual, no tiene permisos locales
    if (currentBranchId && !hasAccessToBranch(currentBranchId)) {
      return permissions.local;
    }

    return {
      // Dashboard
      canViewDashboard: getPermission('local.viewDashboard', localRole, permissions.local.canViewDashboard),
      
      // Stock
      canViewStock: permissions.local.canViewStock,
      canOrderFromSupplier: permissions.local.canOrderFromSupplier,
      canDoInventoryCount: permissions.local.canDoInventoryCount,
      
      // Compras / Operaciones
      canUploadInvoice: getPermission('local.createCompras', localRole, permissions.local.canUploadInvoice),
      canViewSuppliers: getPermission('local.viewProveedoresLocal', localRole, permissions.local.canViewSuppliers),
      canViewSupplierAccounts: getPermission('local.viewCuentaCorriente', localRole, permissions.local.canViewSupplierAccounts),
      canPaySupplier: getPermission('local.pagarProveedor', localRole, permissions.local.canPaySupplier),
      canViewPurchaseHistory: getPermission('local.viewCompras', localRole, permissions.local.canViewPurchaseHistory),
      
      // Equipo
      canClockInOut: permissions.local.canClockInOut,
      canViewAllClockIns: getPermission('local.viewClockIns', localRole, permissions.local.canViewAllClockIns),
      canViewTeam: getPermission('local.viewTeam', localRole, permissions.local.canViewTeam),
      canEditSchedules: getPermission('local.editSchedules', localRole, permissions.local.canEditSchedules),
      canViewMonthlyHours: permissions.local.canViewMonthlyHours,
      canViewPayroll: getPermission('local.viewPayroll', localRole, permissions.local.canViewPayroll),
      canInviteEmployees: getPermission('local.inviteEmployees', localRole, permissions.local.canInviteEmployees),
      canDeactivateEmployees: permissions.local.canDeactivateEmployees,
      canViewSalaryAdvances: getPermission('local.viewAdvances', localRole, permissions.local.canViewSalaryAdvances),
      canViewWarnings: getPermission('local.viewWarnings', localRole, permissions.local.canViewWarnings),
      
      // Acciones operativas
      canCreateSalaryAdvance: getPermission('local.createAdvances', localRole, permissions.local.canCreateSalaryAdvance),
      canCancelSalaryAdvance: permissions.local.canCancelSalaryAdvance,
      canCreateWarning: getPermission('local.createWarnings', localRole, permissions.local.canCreateWarning),
      canUploadSignature: getPermission('local.uploadSignatures', localRole, permissions.local.canUploadSignature),
      canDoCoaching: getPermission('local.doCoaching', localRole, permissions.local.canDoCoaching),
      canViewCoaching: getPermission('local.viewCoaching', localRole, permissions.local.canViewCoaching),
      canSendLocalCommunication: getPermission('local.sendLocalCommunications', localRole, permissions.local.canSendLocalCommunication),
      canViewLocalCommunications: getPermission('local.viewLocalCommunications', localRole, permissions.local.canViewLocalCommunications),
      
      // Reuniones
      canViewMeetings: getPermission('local.viewMeetings', localRole, permissions.local.canViewMeetings),
      canCreateMeetings: getPermission('local.createMeetings', localRole, permissions.local.canCreateMeetings),
      canCloseMeetings: getPermission('local.closeMeetings', localRole, permissions.local.canCloseMeetings),
      
      // Cierres
      canViewClosures: getPermission('local.viewClosures', localRole, permissions.local.canViewClosures),
      canCloseShifts: getPermission('local.closeShifts', localRole, permissions.local.canCloseShifts),

      // POS
      canAccessPOS: permissions.local.canAccessPOS,
      canViewKitchen: permissions.local.canViewKitchen,
      canAssignDelivery: permissions.local.canAssignDelivery,
      canOperateDelivery: permissions.local.canOperateDelivery,
      canOpenRegister: permissions.local.canOpenRegister,
      canCloseRegister: permissions.local.canCloseRegister,
      
      // Finanzas
      canViewSalesReports: permissions.local.canViewSalesReports,
      canViewLocalPnL: getPermission('local.viewPL', localRole, permissions.local.canViewLocalPnL),
      canViewCMV: permissions.local.canViewCMV,
      canViewStockMovements: permissions.local.canViewStockMovements,
      canViewGastos: getPermission('local.viewGastos', localRole, permissions.local.canViewGastos),
      canCreateGastos: getPermission('local.createGastos', localRole, permissions.local.canCreateGastos),
      canViewConsumos: getPermission('local.viewConsumos', localRole, permissions.local.canViewConsumos),
      canCreateConsumos: getPermission('local.createConsumos', localRole, permissions.local.canCreateConsumos),
      canViewPeriodos: getPermission('local.viewPeriodos', localRole, permissions.local.canViewPeriodos),
      canEditPeriodos: getPermission('local.editPeriodos', localRole, permissions.local.canEditPeriodos),
      canViewVentasMensualesLocal: getPermission('local.viewVentasMensualesLocal', localRole, permissions.local.canViewVentasMensualesLocal),
      canEditVentasMensualesLocal: getPermission('local.editVentasMensualesLocal', localRole, permissions.local.canEditVentasMensualesLocal),
      
      // Socios
      canViewSocios: getPermission('local.viewSocios', localRole, permissions.local.canViewSocios),
      canEditSocios: getPermission('local.editSocios', localRole, permissions.local.canEditSocios),
      
      // Configuración
      canEditLocalConfig: getPermission('local.editConfig', localRole, permissions.local.canEditLocalConfig),
      canConfigPrinters: permissions.local.canConfigPrinters,
      canConfigShifts: permissions.local.canConfigShifts,
      
      // Carga de ventas
      canEnterSales: getPermission('local.enterSales', localRole, permissions.local.canEnterSales),
    };
  }, [permissions, getPermission, currentBranchId]);

  return {
    ...permissions,
    loading: permissions.loading || loadingConfig,
    loadingConfig,
    brand: dynamicBrandPermissions,
    local: dynamicLocalPermissions,
  };
}

export default useDynamicPermissions;

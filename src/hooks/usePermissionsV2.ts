/**
 * usePermissionsV2 Hook - Sistema de Roles Fijos
 * 
 * Nueva arquitectura simplificada sin plantillas ni overrides.
 * 
 * Roles de Marca (brand_role):
 * - superadmin: Dueño de la marca, acceso total
 * - coordinador: Marketing/gestión de productos
 * - informes: Solo reportes (socio/inversor)
 * - contador_marca: Finanzas de marca
 * 
 * Roles Locales (local_role):
 * - franquiciado: Dueño del local
 * - encargado: Gestión día a día
 * - contador_local: Finanzas del local
 * - cajero: Operación POS/Caja
 * - empleado: Solo Mi Cuenta
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

// Tipos de roles
export type BrandRole = 'superadmin' | 'coordinador' | 'informes' | 'contador_marca' | null;
export type LocalRole = 'franquiciado' | 'encargado' | 'contador_local' | 'cajero' | 'empleado' | null;

// Estructura de datos del rol del usuario
interface UserRoleV2 {
  id: string;
  user_id: string;
  brand_role: BrandRole;
  local_role: LocalRole;
  branch_ids: string[];
  authorization_pin_hash: string | null;
  is_active: boolean;
}

// Interface de retorno del hook
export interface PermissionsV2 {
  // Estado
  loading: boolean;
  error: Error | null;
  
  // Roles
  brandRole: BrandRole;
  localRole: LocalRole;
  branchIds: string[];
  accessibleBranches: Branch[];
  
  // Helpers de rol
  isSuperadmin: boolean;
  isCoordinador: boolean;
  isInformes: boolean;
  isContadorMarca: boolean;
  isFranquiciado: boolean;
  isEncargado: boolean;
  isContadorLocal: boolean;
  isCajero: boolean;
  isEmpleado: boolean;
  
  // Acceso a paneles
  canAccessBrandPanel: boolean;
  canAccessLocalPanel: boolean;
  
  // Verificación de acceso a sucursal
  hasAccessToBranch: (branchId: string) => boolean;
  canApproveWithPin: boolean;
  
  // ===== PERMISOS PANEL MARCA =====
  brand: {
    // Dashboard
    canViewDashboard: boolean;
    canViewPnL: boolean;
    canViewComparativa: boolean;
    
    // Locales
    canViewLocales: boolean;
    canCreateLocales: boolean;
    
    // Catálogo
    canViewProducts: boolean;
    canEditProducts: boolean;
    canManageModifiers: boolean;
    canManageIngredients: boolean;
    canEditPrices: boolean;
    canManagePromotions: boolean;
    
    // Proveedores
    canManageSuppliers: boolean;
    
    // Equipo
    canManageCentralTeam: boolean;
    canSearchUsers: boolean;
    canAssignRoles: boolean;
    
    // Comunicación
    canManageMessages: boolean;
    
    // Configuración
    canEditBrandConfig: boolean;
    canManageChannels: boolean;
    canManageIntegrations: boolean;
  };
  
  // ===== PERMISOS PANEL LOCAL (MODELO SIMPLIFICADO) =====
  local: {
    // Visión General
    canViewDashboard: boolean;
    canViewCierreTurno: boolean; // DEPRECADO
    
    // Operación - DEPRECADO en modelo simplificado
    canViewIntegrador: boolean;
    canManageOrders: boolean;
    canOperatePOS: boolean;
    canViewKDS: boolean;
    canViewPedidosActivos: boolean;
    canViewHistorial: boolean;
    canCancelOrder: boolean;
    canApplyDiscount: boolean;
    canToggleProductAvailability: boolean;
    
    // Caja - DEPRECADO
    canViewCajaVenta: boolean;
    canOpenCloseCaja: boolean;
    canDoAlivio: boolean;
    canViewCajaAlivio: boolean;
    canViewCajaResguardo: boolean;
    canOperateCajaResguardo: boolean;
    canViewCuentaCorriente: boolean;
    
    // Stock
    canViewStock: boolean;
    canOrderFromSupplier: boolean;
    canDoInventoryCount: boolean;
    
    // Compras
    canUploadInvoice: boolean;
    canViewSuppliers: boolean;
    canViewSupplierAccounts: boolean;
    canPaySupplier: boolean;
    canViewPurchaseHistory: boolean;
    
    // Menú - DEPRECADO
    canViewMenu: boolean;
    canToggleAvailability: boolean;
    
    // Equipo
    canClockInOut: boolean;
    canViewAllClockIns: boolean;
    canViewTeam: boolean;
    canEditSchedules: boolean;
    canViewMonthlyHours: boolean;
    canViewPayroll: boolean;
    canInviteEmployees: boolean;
    canDeactivateEmployees: boolean;
    
    // Reportes
    canViewSalesReports: boolean;
    canViewLocalPnL: boolean;
    canViewCMV: boolean;
    canViewStockMovements: boolean;
    
    // Finanzas - DEPRECADO
    canViewFinanceMovements: boolean;
    canViewInvoices: boolean;
    canViewObligaciones: boolean;
    
    // Configuración
    canEditLocalConfig: boolean;
    canConfigDeliveryZones: boolean;
    canConfigIntegrations: boolean;
    canConfigPrinters: boolean;
    canConfigKDS: boolean;
    canConfigShifts: boolean;
    
    // Nuevo: Carga manual de ventas
    canEnterSales: boolean;
  };
  
  // Refetch
  refetch: () => void;
}

// Labels para UI
export const BRAND_ROLE_LABELS: Record<string, string> = {
  superadmin: 'Superadmin',
  coordinador: 'Coordinador',
  informes: 'Informes',
  contador_marca: 'Contador Marca',
};

export const LOCAL_ROLE_LABELS: Record<string, string> = {
  franquiciado: 'Franquiciado',
  encargado: 'Encargado',
  contador_local: 'Contador Local',
  cajero: 'Cajero',
  empleado: 'Empleado',
};

export function usePermissionsV2(currentBranchId?: string): PermissionsV2 {
  const { user } = useAuth();
  
  // Query para obtener el rol del usuario
  const { 
    data: userRole, 
    isLoading: loadingRole, 
    error: roleError,
    refetch: refetchRole
  } = useQuery({
    queryKey: ['user-role-v2', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_roles_v2')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data as UserRoleV2 | null;
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
  
  // Query para obtener sucursales accesibles
  const { 
    data: branches = [], 
    isLoading: loadingBranches 
  } = useQuery({
    queryKey: ['accessible-branches-v2', user?.id, userRole?.branch_ids, userRole?.brand_role],
    queryFn: async () => {
      if (!user?.id || !userRole) return [];
      
      // Superadmin ve todas las sucursales
      if (userRole.brand_role === 'superadmin') {
        const { data } = await supabase
          .from('branches')
          .select('*')
          .eq('is_active', true)
          .order('name');
        return data || [];
      }
      
      // Otros ven solo las asignadas
      if (userRole.branch_ids && userRole.branch_ids.length > 0) {
        const { data } = await supabase
          .from('branches')
          .select('*')
          .in('id', userRole.branch_ids)
          .eq('is_active', true)
          .order('name');
        return data || [];
      }
      
      return [];
    },
    enabled: !!user?.id && !!userRole,
    staleTime: 60 * 1000,
  });
  
  // Extraer roles
  const brandRole = (userRole?.brand_role as BrandRole) || null;
  const localRole = (userRole?.local_role as LocalRole) || null;
  const branchIds = userRole?.branch_ids || [];
  
  // Helpers de rol
  const isSuperadmin = brandRole === 'superadmin';
  const isCoordinador = brandRole === 'coordinador';
  const isInformes = brandRole === 'informes';
  const isContadorMarca = brandRole === 'contador_marca';
  
  const isFranquiciado = localRole === 'franquiciado';
  const isEncargado = localRole === 'encargado';
  const isContadorLocal = localRole === 'contador_local';
  const isCajero = localRole === 'cajero';
  const isEmpleado = localRole === 'empleado';
  
  // Acceso a paneles
  const canAccessBrandPanel = !!brandRole;
  const canAccessLocalPanel = !!localRole;
  
  // Verificar acceso a sucursal específica
  const hasAccessToBranch = (branchId: string): boolean => {
    if (isSuperadmin) return true;
    return branchIds.includes(branchId);
  };
  
  const canApproveWithPin = isFranquiciado || isEncargado;
  
  // ===== CALCULAR PERMISOS DE MARCA =====
  const brandPermissions = {
    // Dashboard
    canViewDashboard: !!brandRole,
    canViewPnL: isSuperadmin || isInformes || isContadorMarca,
    canViewComparativa: !!brandRole,
    
    // Locales
    canViewLocales: !!brandRole,
    canCreateLocales: isSuperadmin,
    
    // Catálogo
    canViewProducts: isSuperadmin || isCoordinador,
    canEditProducts: isSuperadmin || isCoordinador,
    canManageModifiers: isSuperadmin || isCoordinador,
    canManageIngredients: isSuperadmin || isCoordinador,
    canEditPrices: isSuperadmin || isCoordinador,
    canManagePromotions: isSuperadmin || isCoordinador,
    
    // Proveedores
    canManageSuppliers: isSuperadmin,
    
    // Equipo
    canManageCentralTeam: isSuperadmin,
    canSearchUsers: isSuperadmin,
    canAssignRoles: isSuperadmin,
    
    // Comunicación
    canManageMessages: isSuperadmin || isCoordinador,
    
    // Configuración
    canEditBrandConfig: isSuperadmin,
    canManageChannels: isSuperadmin || isCoordinador,
    canManageIntegrations: isSuperadmin,
  };
  
  // ===== CALCULAR PERMISOS LOCALES =====
  // Verificar si tiene acceso a la sucursal actual
  const hasCurrentBranchAccess = currentBranchId ? hasAccessToBranch(currentBranchId) : true;
  
  // ===== MODELO SIMPLIFICADO - Sin POS/KDS automático =====
  // Cajeros y Empleados: solo ven su info personal (Mi Cuenta)
  // Encargados/Franquiciados: gestión completa simplificada
  
  const localPermissions = {
    // Visión General - Solo roles de gestión
    canViewDashboard: hasCurrentBranchAccess && (isEncargado || isFranquiciado),
    canViewCierreTurno: false, // DEPRECADO - sin sistema de caja automático
    
    // Operación - DEPRECADO en modelo simplificado
    canViewIntegrador: false,
    canManageOrders: false,
    canOperatePOS: false,
    canViewKDS: false,
    canViewPedidosActivos: false,
    canViewHistorial: false,
    canCancelOrder: false,
    canApplyDiscount: false,
    canToggleProductAvailability: false,
    
    // Caja - DEPRECADO en modelo simplificado  
    canViewCajaVenta: false,
    canOpenCloseCaja: false,
    canDoAlivio: false,
    canViewCajaAlivio: false,
    canViewCajaResguardo: false,
    canOperateCajaResguardo: false,
    canViewCuentaCorriente: false,
    
    // Stock - Solo encargados y franquiciados
    canViewStock: hasCurrentBranchAccess && (isEncargado || isFranquiciado),
    canOrderFromSupplier: hasCurrentBranchAccess && (isEncargado || isFranquiciado),
    canDoInventoryCount: hasCurrentBranchAccess && (isEncargado || isFranquiciado),
    
    // Compras
    canUploadInvoice: hasCurrentBranchAccess && (isContadorLocal || isEncargado || isFranquiciado),
    canViewSuppliers: hasCurrentBranchAccess && (isContadorLocal || isEncargado || isFranquiciado),
    canViewSupplierAccounts: hasCurrentBranchAccess && (isContadorLocal || isEncargado || isFranquiciado),
    canPaySupplier: hasCurrentBranchAccess && (isContadorLocal || isFranquiciado),
    canViewPurchaseHistory: hasCurrentBranchAccess && (isContadorLocal || isEncargado || isFranquiciado),
    
    // Menú - DEPRECADO en modelo simplificado
    canViewMenu: false,
    canToggleAvailability: false,
    
    // Equipo - Cajeros/empleados solo ven su propia info en Mi Cuenta
    canClockInOut: hasCurrentBranchAccess && !!localRole,
    canViewAllClockIns: hasCurrentBranchAccess && (isEncargado || isFranquiciado),
    canViewTeam: hasCurrentBranchAccess && (isEncargado || isFranquiciado),
    canEditSchedules: hasCurrentBranchAccess && (isEncargado || isFranquiciado),
    canViewMonthlyHours: hasCurrentBranchAccess && (isEncargado || isFranquiciado),
    canViewPayroll: hasCurrentBranchAccess && (isEncargado || isFranquiciado),
    canInviteEmployees: hasCurrentBranchAccess && (isEncargado || isFranquiciado),
    canDeactivateEmployees: hasCurrentBranchAccess && (isEncargado || isFranquiciado),
    
    // Reportes - Solo roles de gestión
    canViewSalesReports: hasCurrentBranchAccess && (isEncargado || isFranquiciado),
    canViewLocalPnL: hasCurrentBranchAccess && (isContadorLocal || isFranquiciado),
    canViewCMV: hasCurrentBranchAccess && isFranquiciado,
    canViewStockMovements: hasCurrentBranchAccess && (isEncargado || isFranquiciado),
    
    // Finanzas - DEPRECADO en modelo simplificado
    canViewFinanceMovements: false,
    canViewInvoices: false,
    canViewObligaciones: false,
    
    // Configuración - Solo franquiciados
    canEditLocalConfig: hasCurrentBranchAccess && isFranquiciado,
    canConfigDeliveryZones: false, // DEPRECADO
    canConfigIntegrations: false, // DEPRECADO
    canConfigPrinters: hasCurrentBranchAccess && (isEncargado || isFranquiciado),
    canConfigKDS: false, // DEPRECADO
    canConfigShifts: hasCurrentBranchAccess && isFranquiciado,
    
    // Nuevo: Carga manual de ventas
    canEnterSales: hasCurrentBranchAccess && (isEncargado || isFranquiciado),
  };
  
  return {
    // Estado
    loading: loadingRole || loadingBranches,
    error: roleError as Error | null,
    
    // Roles
    brandRole,
    localRole,
    branchIds,
    accessibleBranches: branches as Branch[],
    
    // Helpers de rol
    isSuperadmin,
    isCoordinador,
    isInformes,
    isContadorMarca,
    isFranquiciado,
    isEncargado,
    isContadorLocal,
    isCajero,
    isEmpleado,
    
    // Acceso a paneles
    canAccessBrandPanel,
    canAccessLocalPanel,
    
    // Verificación
    hasAccessToBranch,
    canApproveWithPin,
    
    // Permisos
    brand: brandPermissions,
    local: localPermissions,
    
    // Refetch
    refetch: refetchRole,
  };
}

export default usePermissionsV2;

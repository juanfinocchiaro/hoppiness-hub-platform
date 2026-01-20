import { useUserRole } from './useUserRole';

export type AvatarType = 
  | 'brand_owner'      // Admin/Dueño de marca - ve todo
  | 'partner'          // Socio - ve reportes de marca
  | 'coordinator'      // Coordinador digital - gestión
  | 'franchise_owner'  // Franquiciado - ve solo su local
  | 'manager'          // Encargado - operación diaria
  | 'cashier'          // Cajero - POS directo
  | 'kds'              // KDS - cocina
  | 'employee';        // Empleado general

export interface AvatarInfo {
  type: AvatarType;
  label: string;
  landingPath: string;
  description: string;
  directToPOS?: boolean;
  directToKDS?: boolean;
}

/**
 * Determina el avatar del usuario basado en sus roles y permisos
 * y devuelve la landing ideal para ese avatar
 */
export function useRoleLanding() {
  const {
    isAdmin,
    isCoordinador,
    isSocio,
    isFranquiciado,
    isEncargado,
    isCajero,
    isKds,
    accessibleBranches,
    loading,
  } = useUserRole();

  const getAvatarInfo = (): AvatarInfo => {
    // Prioridad de roles: de más específico a más general
    
    // KDS solo ve cocina
    if (isKds && !isCajero && !isEncargado && !isFranquiciado && !isAdmin) {
      return {
        type: 'kds',
        label: 'Cocina',
        landingPath: accessibleBranches[0] ? `/local/${accessibleBranches[0].id}` : '/local',
        description: 'Vista de cocina por estaciones',
        directToKDS: true,
      };
    }

    // Cajero va directo al POS
    if (isCajero && !isEncargado && !isFranquiciado && !isAdmin) {
      return {
        type: 'cashier',
        label: 'Cajero',
        landingPath: accessibleBranches[0] ? `/local/${accessibleBranches[0].id}` : '/local',
        description: 'Punto de venta y cobro rápido',
        directToPOS: true,
      };
    }

    // Encargado ve dashboard del local con operación
    if (isEncargado && !isFranquiciado && !isAdmin) {
      return {
        type: 'manager',
        label: 'Encargado',
        landingPath: accessibleBranches[0] ? `/local/${accessibleBranches[0].id}` : '/local',
        description: 'Gestión operativa diaria',
      };
    }

    // Franquiciado ve dashboard de su local (con P&L)
    if (isFranquiciado && !isAdmin) {
      return {
        type: 'franchise_owner',
        label: 'Dueño de Franquicia',
        landingPath: accessibleBranches[0] ? `/local/${accessibleBranches[0].id}` : '/local',
        description: 'Vista completa de tu local',
      };
    }

    // Socio ve reportes de marca
    if (isSocio && !isAdmin) {
      return {
        type: 'partner',
        label: 'Socio',
        landingPath: '/admin/reportes',
        description: 'Reportes financieros de la marca',
      };
    }

    // Coordinador ve admin con foco en catálogo
    if (isCoordinador && !isAdmin) {
      return {
        type: 'coordinator',
        label: 'Coordinador',
        landingPath: '/admin',
        description: 'Gestión de catálogo y operaciones',
      };
    }

    // Admin/Dueño de marca ve todo
    if (isAdmin) {
      return {
        type: 'brand_owner',
        label: 'Administrador',
        landingPath: '/admin',
        description: 'Control total de la marca',
      };
    }

    // Default: empleado general
    return {
      type: 'employee',
      label: 'Empleado',
      landingPath: accessibleBranches[0] ? `/local/${accessibleBranches[0].id}` : '/',
      description: 'Acceso básico',
    };
  };

  const avatarInfo = getAvatarInfo();

  return {
    avatarInfo,
    loading,
    // Helpers para UI
    isOperationalRole: ['cashier', 'kds', 'employee'].includes(avatarInfo.type),
    isManagementRole: ['manager', 'franchise_owner'].includes(avatarInfo.type),
    isBrandRole: ['brand_owner', 'partner', 'coordinator'].includes(avatarInfo.type),
  };
}

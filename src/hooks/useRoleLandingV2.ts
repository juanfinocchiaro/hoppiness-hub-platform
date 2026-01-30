/**
 * useRoleLandingV2 - Determina landing y accesos basado en roles fijos
 */
import { usePermissionsV2, type BrandRole, type LocalRole } from './usePermissionsV2';

// Alineado con los roles reales de la DB: brand_role_type y local_role_type
export type AvatarType = 
  | 'superadmin'
  | 'coordinador'
  | 'informes'
  | 'contador_marca'
  | 'franquiciado'
  | 'encargado'
  | 'contador_local'
  | 'cajero'
  | 'empleado'
  | 'guest';

export interface AvatarInfo {
  type: AvatarType;
  label: string;
  landingPath: string;
  description: string;
}

export function useRoleLandingV2() {
  const {
    loading,
    brandRole,
    localRole,
    accessibleBranches,
    canAccessBrandPanel,
    canAccessLocalPanel,
    isSuperadmin,
    isCoordinador,
    isInformes,
    isContadorMarca,
    isFranquiciado,
    isEncargado,
    isContadorLocal,
    isCajero,
    isEmpleado,
  } = usePermissionsV2();

  const getAvatarInfo = (): AvatarInfo => {
    // Roles de marca
    if (isSuperadmin) {
      return {
        type: 'superadmin',
        label: 'Superadmin',
        landingPath: '/mimarca',
        description: 'Control total de la marca',
      };
    }

    if (isCoordinador) {
      return {
        type: 'coordinador',
        label: 'Coordinador',
        landingPath: '/mimarca',
        description: 'Gestión de catálogo y marketing',
      };
    }

    if (isInformes) {
      return {
        type: 'informes',
        label: 'Informes',
        landingPath: '/mimarca',
        description: 'Vista de reportes de marca',
      };
    }

    if (isContadorMarca) {
      return {
        type: 'contador_marca',
        label: 'Contador Marca',
        landingPath: '/mimarca',
        description: 'Finanzas consolidadas',
      };
    }

    // Roles locales
    if (isFranquiciado) {
      const firstBranch = accessibleBranches[0]?.id;
      return {
        type: 'franquiciado',
        label: 'Franquiciado',
        landingPath: firstBranch ? `/milocal/${firstBranch}` : '/milocal',
        description: 'Gestión completa del local',
      };
    }

    if (isEncargado) {
      const firstBranch = accessibleBranches[0]?.id;
      return {
        type: 'encargado',
        label: 'Encargado',
        landingPath: firstBranch ? `/milocal/${firstBranch}` : '/milocal',
        description: 'Operación diaria del local',
      };
    }

    if (isContadorLocal) {
      return {
        type: 'contador_local',
        label: 'Contador Local',
        landingPath: '/cuenta',
        description: 'Mi Cuenta',
      };
    }

    if (isCajero) {
      return {
        type: 'cajero',
        label: 'Cajero',
        landingPath: '/cuenta',
        description: 'Mi Cuenta',
      };
    }

    if (isEmpleado) {
      return {
        type: 'empleado',
        label: 'Empleado',
        landingPath: '/cuenta',
        description: 'Mi Cuenta',
      };
    }

    // Sin rol asignado
    return {
      type: 'guest',
      label: 'Usuario',
      landingPath: '/cuenta',
      description: 'Mi Cuenta',
    };
  };

  const avatarInfo = getAvatarInfo();

  return {
    avatarInfo,
    loading,
    canAccessAdmin: canAccessBrandPanel,
    canAccessLocal: canAccessLocalPanel,
    accessibleBranches,
    isOperationalRole: ['cajero', 'empleado'].includes(avatarInfo.type),
    isManagementRole: ['encargado', 'franquiciado'].includes(avatarInfo.type),
    isBrandRole: ['superadmin', 'coordinador', 'informes', 'contador_marca'].includes(avatarInfo.type),
  };
}

export default useRoleLandingV2;

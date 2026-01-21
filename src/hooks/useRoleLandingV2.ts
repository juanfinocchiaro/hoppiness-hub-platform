/**
 * useRoleLandingV2 - Determina landing y accesos basado en roles fijos
 * 
 * Reemplaza a useRoleLanding con la nueva arquitectura.
 */
import { usePermissionsV2, type BrandRole, type LocalRole } from './usePermissionsV2';

export type AvatarType = 
  | 'superadmin'       // Dueño de marca - todo
  | 'coordinador'      // Marketing/gestión
  | 'informes'         // Solo reportes (socio)
  | 'contador_marca'   // Finanzas marca
  | 'franquiciado'     // Dueño del local
  | 'encargado'        // Gestión día a día
  | 'contador_local'   // Finanzas local
  | 'cajero'           // Operación POS
  | 'empleado'         // Solo Mi Cuenta/KDS
  | 'guest';           // Sin rol asignado

export interface AvatarInfo {
  type: AvatarType;
  label: string;
  landingPath: string;
  description: string;
  directToPOS?: boolean;
  directToKDS?: boolean;
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
    // Prioridad: roles de marca primero (más específicos)
    
    if (isSuperadmin) {
      return {
        type: 'superadmin',
        label: 'Superadmin',
        landingPath: '/admin',
        description: 'Control total de la marca',
      };
    }

    if (isCoordinador) {
      return {
        type: 'coordinador',
        label: 'Coordinador',
        landingPath: '/admin',
        description: 'Gestión de catálogo y marketing',
      };
    }

    if (isInformes) {
      return {
        type: 'informes',
        label: 'Informes',
        landingPath: '/admin/resultados',
        description: 'Vista de reportes de marca',
      };
    }

    if (isContadorMarca) {
      return {
        type: 'contador_marca',
        label: 'Contador Marca',
        landingPath: '/admin/resultados',
        description: 'Finanzas consolidadas',
      };
    }

    // Roles locales
    if (isFranquiciado) {
      const firstBranch = accessibleBranches[0]?.id;
      return {
        type: 'franquiciado',
        label: 'Franquiciado',
        landingPath: firstBranch ? `/local/${firstBranch}` : '/local',
        description: 'Gestión completa del local',
      };
    }

    if (isEncargado) {
      const firstBranch = accessibleBranches[0]?.id;
      return {
        type: 'encargado',
        label: 'Encargado',
        landingPath: firstBranch ? `/local/${firstBranch}` : '/local',
        description: 'Operación diaria del local',
      };
    }

    if (isContadorLocal) {
      const firstBranch = accessibleBranches[0]?.id;
      return {
        type: 'contador_local',
        label: 'Contador Local',
        landingPath: firstBranch ? `/local/${firstBranch}/finanzas/movimientos` : '/local',
        description: 'Finanzas del local',
      };
    }

    if (isCajero) {
      const firstBranch = accessibleBranches[0]?.id;
      return {
        type: 'cajero',
        label: 'Cajero',
        landingPath: firstBranch ? `/local/${firstBranch}/pos` : '/local',
        description: 'Punto de venta',
        directToPOS: true,
      };
    }

    if (isEmpleado) {
      const firstBranch = accessibleBranches[0]?.id;
      return {
        type: 'empleado',
        label: 'Empleado',
        landingPath: firstBranch ? `/local/${firstBranch}/kds` : '/cuenta',
        description: 'Cocina / Mi Cuenta',
        directToKDS: true,
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
    // Accesos
    canAccessAdmin: canAccessBrandPanel,
    canAccessLocal: canAccessLocalPanel,
    accessibleBranches,
    // Helpers
    isOperationalRole: ['cajero', 'empleado'].includes(avatarInfo.type),
    isManagementRole: ['encargado', 'franquiciado'].includes(avatarInfo.type),
    isBrandRole: ['superadmin', 'coordinador', 'informes', 'contador_marca'].includes(avatarInfo.type),
  };
}

export default useRoleLandingV2;

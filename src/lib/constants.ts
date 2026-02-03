/**
 * Constantes globales de la aplicación
 */

// Dominio oficial de producción para links públicos
// Usar este en lugar de window.location.origin para links que se comparten externamente
export const PRODUCTION_DOMAIN = 'https://www.hoppinessclub.com';

/**
 * Genera la URL de fichaje para un local
 * @param clockCode - Código único del local (ej: "mnt")
 */
export const getClockInUrl = (clockCode: string): string => {
  return `${PRODUCTION_DOMAIN}/fichaje/${clockCode}`;
};

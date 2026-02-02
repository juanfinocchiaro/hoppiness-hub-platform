export interface HelpConfig {
  pageId: string;
  title: string;
  description: string;
  tips: string[];
  videoUrl?: string;
}

export const HELP_CONFIG: Record<string, HelpConfig> = {
  // Mi Local pages
  'local-dashboard': {
    pageId: 'local-dashboard',
    title: 'Dashboard del Local',
    description: 'Visión general del estado de tu sucursal con turnos y equipo activo.',
    tips: [
      'Las cards de turno muestran el estado de carga de ventas',
      'Podés ver quién está fichado y cuánto tiempo llevan',
      'Los pendientes te muestran tareas que requieren tu atención',
    ],
  },
  'local-team': {
    pageId: 'local-team',
    title: 'Gestión de Equipo',
    description: 'Desde aquí podés ver y gestionar a todos los empleados asignados a esta sucursal.',
    tips: [
      'Tocá en un empleado para ver sus datos completos',
      'Usá el botón "Invitar" para sumar nuevos integrantes',
      'Los roles determinan qué puede hacer cada persona',
    ],
  },
  'local-schedules': {
    pageId: 'local-schedules',
    title: 'Horarios del Mes',
    description: 'Planificá los turnos de trabajo de tu equipo.',
    tips: [
      'Publicá los horarios antes del día 25 de cada mes',
      'Los empleados reciben notificación cuando publicás',
      'Podés copiar horarios de la semana anterior',
    ],
  },
  'local-clockins': {
    pageId: 'local-clockins',
    title: 'Fichajes',
    description: 'Historial de entradas y salidas de tu equipo.',
    tips: [
      'Podés filtrar por empleado o fecha',
      'Los turnos que cruzan medianoche se asignan al día de entrada',
      'Marcá como "sin par" si falta una entrada o salida',
    ],
  },
  'local-advances': {
    pageId: 'local-advances',
    title: 'Adelantos de Sueldo',
    description: 'Registrá adelantos de sueldo para tu equipo.',
    tips: [
      'Cada adelanto requiere autorización con PIN',
      'Se descuentan automáticamente en la liquidación',
      'Podés ver el historial completo por empleado',
    ],
  },
  'local-warnings': {
    pageId: 'local-warnings',
    title: 'Apercibimientos',
    description: 'Registro de apercibimientos y llamados de atención.',
    tips: [
      'El empleado debe acusar recibo del apercibimiento',
      'Quedan registrados en su historial',
      'Podés adjuntar una foto del documento firmado',
    ],
  },
  'local-hours': {
    pageId: 'local-hours',
    title: 'Horas del Mes',
    description: 'Resumen de horas trabajadas por empleado.',
    tips: [
      'Usá el selector para cambiar de mes',
      'Exportá a CSV para pasarle al contador',
      'Las advertencias indican fichajes sin par',
    ],
  },
  
  // Mi Marca pages
  'brand-dashboard': {
    pageId: 'brand-dashboard',
    title: 'Dashboard de Marca',
    description: 'Visión consolidada de todas tus sucursales.',
    tips: [
      'Cada columna representa una sucursal',
      'Los colores indican si hay alertas',
      'Tocá una sucursal para ver más detalles',
    ],
  },
  'brand-users': {
    pageId: 'brand-users',
    title: 'Gestión de Usuarios',
    description: 'Administrá todos los usuarios de la plataforma.',
    tips: [
      'Usá los filtros para encontrar usuarios',
      'Podés asignar roles de marca y de local',
      'Un usuario puede tener diferentes roles en distintas sucursales',
    ],
  },
  'brand-communications': {
    pageId: 'brand-communications',
    title: 'Comunicados de Marca',
    description: 'Envía mensajes a toda la red o a roles específicos.',
    tips: [
      'Los comunicados urgentes aparecen destacados',
      'Podés requerir confirmación de lectura',
      'Mirá cuántos leyeron cada comunicado',
    ],
  },
  'brand-regulations': {
    pageId: 'brand-regulations',
    title: 'Reglamentos',
    description: 'Gestión de reglamentos internos para el equipo.',
    tips: [
      'Subí el PDF del reglamento actualizado',
      'Cada versión nueva requiere firma de todos',
      'Si no firman en 5 días, no pueden fichar',
    ],
  },

  // Mi Cuenta pages
  'cuenta-dashboard': {
    pageId: 'cuenta-dashboard',
    title: 'Mi Cuenta',
    description: 'Tu portal personal con todo lo que necesitás.',
    tips: [
      'Tus comunicados pendientes aparecen primero',
      'Podés ver tus próximos horarios y fichajes',
      'Solicitá días libres desde aquí',
    ],
  },
  'cuenta-profile': {
    pageId: 'cuenta-profile',
    title: 'Mi Perfil',
    description: 'Gestioná tu información personal.',
    tips: [
      'Configurá tu PIN de fichaje de 4 dígitos',
      'Mantené tu teléfono actualizado',
      'Tu foto aparece cuando fichás',
    ],
  },
};

export function getHelpConfig(pageId: string): HelpConfig | null {
  return HELP_CONFIG[pageId] || null;
}

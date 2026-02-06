/**
 * CoachingSuggestions - Sugerencias inteligentes basadas en scores
 * Mejora #4: Plantillas y Sugerencias Inteligentes
 */

interface ScoreSuggestion {
  minScore: number;
  maxScore: number;
  area: string;
  suggestions: {
    strengths: string[];
    improvements: string[];
    actions: string[];
  };
}

// Sugerencias por área y rango de score
const SUGGESTIONS_BY_AREA: Record<string, ScoreSuggestion[]> = {
  'atencion': [
    {
      minScore: 0,
      maxScore: 2,
      area: 'Atención al Cliente',
      suggestions: {
        strengths: [],
        improvements: [
          'Mejorar comunicación con clientes',
          'Trabajar en paciencia y empatía',
          'Practicar manejo de quejas',
        ],
        actions: [
          'Shadowing con empleado destacado en atención',
          'Roleplay de situaciones difíciles',
          'Leer manual de atención al cliente',
        ],
      },
    },
    {
      minScore: 2,
      maxScore: 3,
      area: 'Atención al Cliente',
      suggestions: {
        strengths: ['Buena disposición para atender'],
        improvements: ['Pulir habilidades de comunicación'],
        actions: ['Practicar upselling sugerido'],
      },
    },
    {
      minScore: 3,
      maxScore: 4,
      area: 'Atención al Cliente',
      suggestions: {
        strengths: ['Excelente trato con clientes', 'Resuelve problemas con calma'],
        improvements: [],
        actions: ['Mentorear a compañeros nuevos'],
      },
    },
  ],
  'puntualidad': [
    {
      minScore: 0,
      maxScore: 2,
      area: 'Puntualidad',
      suggestions: {
        strengths: [],
        improvements: [
          'Llegadas tarde frecuentes',
          'Mejorar compromiso con horarios',
        ],
        actions: [
          'Establecer alarmas 30 min antes',
          'Revisar transporte alternativo',
          'Conversar sobre compromiso',
        ],
      },
    },
    {
      minScore: 2,
      maxScore: 3,
      area: 'Puntualidad',
      suggestions: {
        strengths: ['Generalmente puntual'],
        improvements: ['Algunas llegadas tarde ocasionales'],
        actions: ['Mantener constancia'],
      },
    },
    {
      minScore: 3,
      maxScore: 4,
      area: 'Puntualidad',
      suggestions: {
        strengths: ['Siempre puntual', 'Ejemplo para el equipo'],
        improvements: [],
        actions: [],
      },
    },
  ],
  'trabajo_equipo': [
    {
      minScore: 0,
      maxScore: 2,
      area: 'Trabajo en Equipo',
      suggestions: {
        strengths: [],
        improvements: [
          'Mejorar comunicación con compañeros',
          'Colaborar más activamente',
        ],
        actions: [
          'Asignar tareas colaborativas',
          'Feedback de compañeros',
        ],
      },
    },
    {
      minScore: 2,
      maxScore: 3,
      area: 'Trabajo en Equipo',
      suggestions: {
        strengths: ['Colabora cuando se le pide'],
        improvements: ['Tomar más iniciativa'],
        actions: ['Liderar una tarea grupal'],
      },
    },
    {
      minScore: 3,
      maxScore: 4,
      area: 'Trabajo en Equipo',
      suggestions: {
        strengths: ['Excelente compañero', 'Ayuda proactivamente'],
        improvements: [],
        actions: ['Ser referente del equipo'],
      },
    },
  ],
  'cocina': [
    {
      minScore: 0,
      maxScore: 2,
      area: 'Estación de Cocina',
      suggestions: {
        strengths: [],
        improvements: [
          'Mejorar tiempos de preparación',
          'Cuidar presentación de platos',
          'Seguir recetas estándar',
        ],
        actions: [
          'Entrenamiento intensivo con encargado',
          'Revisar video de técnicas',
          'Practicar en horas valle',
        ],
      },
    },
    {
      minScore: 2,
      maxScore: 3,
      area: 'Estación de Cocina',
      suggestions: {
        strengths: ['Conoce los procesos básicos'],
        improvements: ['Mejorar velocidad', 'Consistencia en presentación'],
        actions: ['Cronometrar tiempos de preparación'],
      },
    },
    {
      minScore: 3,
      maxScore: 4,
      area: 'Estación de Cocina',
      suggestions: {
        strengths: ['Domina la estación', 'Rápido y preciso'],
        improvements: [],
        actions: ['Enseñar a nuevos empleados'],
      },
    },
  ],
  'caja': [
    {
      minScore: 0,
      maxScore: 2,
      area: 'Caja',
      suggestions: {
        strengths: [],
        improvements: [
          'Reducir errores de cobro',
          'Mejorar manejo del sistema POS',
        ],
        actions: [
          'Práctica supervisada en caja',
          'Revisar procedimientos de cierre',
        ],
      },
    },
    {
      minScore: 2,
      maxScore: 3,
      area: 'Caja',
      suggestions: {
        strengths: ['Opera la caja correctamente'],
        improvements: ['Agilizar tiempos de cobro'],
        actions: ['Practicar flujo de caja en horas pico'],
      },
    },
    {
      minScore: 3,
      maxScore: 4,
      area: 'Caja',
      suggestions: {
        strengths: ['Excelente manejo de caja', 'Sin errores de arqueo'],
        improvements: [],
        actions: ['Capacitar a compañeros'],
      },
    },
  ],
};

// Plantillas de planes de acción comunes
export const ACTION_PLAN_TEMPLATES = [
  {
    title: 'Mejora de velocidad',
    text: 'Practicar durante horas valle para mejorar tiempos. Objetivo: reducir 30% el tiempo por orden.',
  },
  {
    title: 'Atención al cliente',
    text: 'Hacer shadowing con empleado destacado. Practicar frases de bienvenida y despedida.',
  },
  {
    title: 'Trabajo en equipo',
    text: 'Asignar como líder de limpieza semanal. Fomentar comunicación con compañeros de turno.',
  },
  {
    title: 'Puntualidad',
    text: 'Establecer compromiso de llegar 10 min antes. Revisar en siguiente coaching.',
  },
  {
    title: 'Capacitación cruzada',
    text: 'Entrenar en una nueva estación para ampliar habilidades. Meta: certificación básica en 30 días.',
  },
];

/**
 * Obtiene sugerencias basadas en los scores de las competencias
 */
export function getSuggestionsForScores(
  competencyScores: { key: string; score: number }[]
): {
  strengths: string[];
  improvements: string[];
  actions: string[];
} {
  const result = {
    strengths: [] as string[],
    improvements: [] as string[],
    actions: [] as string[],
  };

  competencyScores.forEach(({ key, score }) => {
    // Normalize key to match our suggestion keys
    const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, '_');
    
    // Find matching area
    const areaSuggestions = SUGGESTIONS_BY_AREA[normalizedKey] || 
      SUGGESTIONS_BY_AREA[key] ||
      Object.values(SUGGESTIONS_BY_AREA).find(arr => 
        arr.some(s => s.area.toLowerCase().includes(normalizedKey))
      );

    if (areaSuggestions) {
      const match = areaSuggestions.find(
        s => score >= s.minScore && score < s.maxScore
      );
      
      if (match) {
        result.strengths.push(...match.suggestions.strengths);
        result.improvements.push(...match.suggestions.improvements);
        result.actions.push(...match.suggestions.actions);
      }
    }
  });

  // Remove duplicates
  return {
    strengths: [...new Set(result.strengths)],
    improvements: [...new Set(result.improvements)],
    actions: [...new Set(result.actions)],
  };
}

/**
 * Genera texto de fortalezas basado en score general
 */
export function generateStrengthsText(avgScore: number): string {
  if (avgScore >= 3.5) {
    return 'Excelente desempeño general. Destaca por su compromiso y habilidades.';
  } else if (avgScore >= 3) {
    return 'Buen desempeño. Muestra mejora constante.';
  } else if (avgScore >= 2.5) {
    return 'Desempeño aceptable con potencial de mejora.';
  }
  return '';
}

/**
 * Genera texto de áreas de mejora basado en score general
 */
export function generateImprovementsText(avgScore: number): string {
  if (avgScore < 2) {
    return 'Requiere atención inmediata en múltiples áreas.';
  } else if (avgScore < 2.5) {
    return 'Necesita enfocarse en mejorar consistencia.';
  } else if (avgScore < 3) {
    return 'Puede mejorar en algunas áreas específicas.';
  }
  return '';
}



# Plan: Corregir Timeline - Expansión 2025

## Problema
En el timeline, el año 2025 dice:
> "Mejor Hamburguesería de Córdoba. General Paz y Villa Carlos Paz."

Pero no queda claro que **General Paz y Villa Carlos Paz son expansiones** (nuevas aperturas), como sí se entiende claramente en 2023:
> "Expansión: Manantiales y Villa Allende. Inauguramos centro de producción."

## Solución
Reformular el texto de 2025 para que explícitamente mencione "Expansión":

**Archivo:** `src/components/landing/TimelineSection.tsx`

**Cambio (línea 12):**

```tsx
// ANTES
{ year: '2025', text: 'Mejor Hamburguesería de Córdoba. General Paz y Villa Carlos Paz.', highlight: true },

// DESPUÉS
{ year: '2025', text: 'Mejor Hamburguesería de Córdoba. Expansión: General Paz y Villa Carlos Paz.', highlight: true },
```

## Resultado Esperado
El timeline mostrará:
- **2023**: Expansión: Manantiales y Villa Allende. Inauguramos centro de producción.
- **2024**: Doble campeones: Mejor Clásica y Mejor Gourmet.
- **2025**: 🏆 Mejor Hamburguesería de Córdoba. **Expansión: General Paz y Villa Carlos Paz.**
- **2026**: Shopping Pocito. Y seguimos creciendo...

Ahora queda claro que en 2025 hubo tanto el premio como la apertura de dos nuevos locales.


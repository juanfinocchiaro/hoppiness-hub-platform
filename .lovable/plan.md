
# Plan: Mejoras al Sistema de Coaching - Escala y UX

## Resumen Ejecutivo
Implementar las mejoras solicitadas por Ismael para el sistema de coaching:
1. Cambiar la escala de puntuación de 1-4 a **1-5**
2. Mejorar las descripciones de cada nivel para que sean claras
3. Mover la leyenda de puntuación **arriba del formulario** para que se lea primero
4. Corregir el problema de navegación donde al clickear un puntaje te lleva a otra pantalla

---

## Análisis del Problema Actual

### Problema 1: Escala limitada (1-4)
La escala actual tiene 4 niveles:
- 1 = Necesita mejorar
- 2 = En desarrollo  
- 3 = Cumple expectativas
- 4 = Supera expectativas

**Limitación**: No hay un nivel que represente la excelencia máxima ("DIOS en ese tema")

### Problema 2: Leyenda al final
La leyenda explicativa está **al final** de cada sección, cuando debería verse **antes** de empezar a evaluar.

### Problema 3: Navegación rota
Al clickear en los botones de score dentro del Collapsible de un empleado, el evento de click se propaga al trigger del Collapsible, cerrando el panel.

---

## Nueva Escala de Puntuación (1-5)

| Nivel | Nombre | Descripción |
|-------|--------|-------------|
| 1 | Aprendiz | Recién empieza, necesita supervisión constante |
| 2 | En Desarrollo | Está aprendiendo, comete errores pero mejora |
| 3 | Competente | Cumple bien, trabaja solo sin problemas |
| 4 | Destacado | Supera lo esperado, muy confiable |
| 5 | Referente | Experto total, puede enseñar y resolver cualquier problema |

El nivel **5 (Referente)** representa a alguien que:
- "Es literalmente DIOS en ese tema"
- Puede solucionar absolutamente cualquier problema
- Puede enseñar a otros sobre esa área
- Es la persona a la que todos recurren

---

## Cambios Técnicos

### Archivos a Modificar

```text
src/components/coaching/CoachingGeneralSection.tsx    # Sección competencias generales
src/components/coaching/CoachingStationSection.tsx    # Sección estaciones de trabajo
src/components/coaching/CoachingManagerSection.tsx    # Sección competencias de encargado
src/components/coaching/CoachingDetailModal.tsx       # Modal de detalle (para mostrar /5)
src/components/coaching/EmployeeCoachingCard.tsx      # Cards de historial
src/components/coaching/ScoreEvolutionChart.tsx       # Gráfico de evolución
src/components/coaching/MyOwnCoachingTab.tsx          # Tab "Mi Evaluación"
src/lib/coachingSuggestions.ts                        # Sugerencias inteligentes
```

### 1. Actualizar scoreLabels en cada archivo

Cambiar la definición de escala en los 3 componentes principales:

```typescript
// Antes (1-4)
const scoreLabels = [
  { value: 1, label: 'Necesita mejorar', ... },
  { value: 2, label: 'En desarrollo', ... },
  { value: 3, label: 'Cumple', ... },
  { value: 4, label: 'Supera', ... },
];

// Después (1-5)
const scoreLabels = [
  { value: 1, label: 'Aprendiz', description: 'Necesita supervisión constante', color: '...' },
  { value: 2, label: 'En Desarrollo', description: 'Mejorando, comete errores', color: '...' },
  { value: 3, label: 'Competente', description: 'Trabaja bien solo', color: '...' },
  { value: 4, label: 'Destacado', description: 'Supera expectativas', color: '...' },
  { value: 5, label: 'Referente', description: 'Experto total, enseña', color: '...' },
];
```

### 2. Mover la leyenda arriba de cada sección

```tsx
// Antes: Leyenda al final
<Card>...</Card>
<div className="leyenda">...</div>

// Después: Leyenda arriba
<ScoreLegend /> {/* Nuevo componente reutilizable */}
<Card>...</Card>
```

### 3. Corregir propagación de eventos en scores

El problema ocurre porque los botones de score están dentro de un `CollapsibleTrigger`. Al hacer click, el evento burbujea y cierra el panel.

```tsx
// Agregar stopPropagation en los handlers de score
<div onClick={(e) => e.stopPropagation()}>
  <RadioGroup
    onValueChange={(value) => {
      e.stopPropagation(); // Prevenir cierre del Collapsible
      onScoreChange(comp.id, parseInt(value));
    }}
  />
</div>
```

### 4. Crear componente reutilizable ScoreLegend

Nuevo archivo `src/components/coaching/ScoreLegend.tsx`:

```tsx
export function ScoreLegend({ compact = false }) {
  return (
    <Card className="mb-4 bg-muted/30">
      <CardContent className="p-4">
        <h4 className="text-sm font-medium mb-3">Guía de Puntuación</h4>
        <div className="grid grid-cols-5 gap-2">
          {scoreLabels.map(s => (
            <div key={s.value} className="text-center">
              <Badge className={s.color}>{s.value}</Badge>
              <p className="text-xs font-medium mt-1">{s.label}</p>
              <p className="text-[10px] text-muted-foreground">{s.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

### 5. Actualizar cálculos de promedio

Cambiar todas las referencias de `/4` a `/5`:
- `CoachingForm.tsx`: línea 179-182 (score display)
- `CoachingDetailModal.tsx`: líneas 25, 37, 219, 314, etc.
- `EmployeeCoachingCard.tsx`: cálculos de promedio
- `ScoreEvolutionChart.tsx`: escala del gráfico

### 6. Actualizar sugerencias inteligentes

Ajustar rangos en `coachingSuggestions.ts`:

```typescript
// Antes (escala 1-4)
{ minScore: 0, maxScore: 2, ... }
{ minScore: 2, maxScore: 3, ... }
{ minScore: 3, maxScore: 4, ... }

// Después (escala 1-5)
{ minScore: 0, maxScore: 2, ... }    // Crítico
{ minScore: 2, maxScore: 3, ... }    // En desarrollo
{ minScore: 3, maxScore: 4, ... }    // Competente
{ minScore: 4, maxScore: 5, ... }    // Destacado/Referente
```

---

## Impacto en Base de Datos

**NO se requieren cambios en la base de datos**. Los scores existentes (1-4) seguirán siendo válidos, simplemente se amplía el rango máximo a 5.

---

## Testing Recomendado

1. Verificar que la leyenda aparece arriba en cada sección
2. Probar clickear puntajes sin que cierre el formulario
3. Verificar que el score 5 se puede seleccionar
4. Revisar que los gráficos de evolución escalan correctamente
5. Confirmar que el modal de detalle muestra `/5`

---

## Resumen de Entregables

| Ítem | Descripción |
|------|-------------|
| Escala 1-5 | Nueva escala con 5 niveles claros |
| Leyenda arriba | Guía visible antes de evaluar |
| Fix navegación | Scores clickeables sin cerrar panel |
| Descripciones claras | Cada nivel bien explicado |
| Nivel "Referente" | El 5 = DIOS en ese tema |

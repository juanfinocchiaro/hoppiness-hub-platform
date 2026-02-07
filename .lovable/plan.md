

# Plan: Categorías Más Específicas + Predisposición Laboral

## Problema Actual

Las 6 categorías actuales son algo genéricas. Falta capturar aspectos específicos como:
- **Predisposición laboral**: gente que no quiere recibir mensajes fuera del horario, que pone trabas
- **Actitud y presencia**: sonrisa, energía, hospitalidad (mencionado antes)
- Más especificidad en cada rúbrica

---

## Propuesta: 8 Categorías Específicas

| # | Categoría | Icono | Qué evalúa específicamente |
|---|-----------|-------|---------------------------|
| 1 | **Comunicación y Reportes** | 💬 | Responde mensajes, reporta novedades, informa problemas con contexto |
| 2 | **Disponibilidad y Predisposición** | 📲 | Responde fuera de horario cuando es necesario, no pone trabas, flexibilidad ante urgencias |
| 3 | **Liderazgo y Clima de Equipo** | 👥 | Maneja conflictos, sostiene buen clima, el equipo lo respeta |
| 4 | **Desarrollo del Staff** | 📚 | Hace coachings, entrena nuevos, da feedback, el equipo mejora |
| 5 | **Adaptación a Cambios** | 🔄 | Implementa cambios de menú/procesos sin resistencia ni quejas |
| 6 | **Resolución Autónoma** | 🔧 | Resuelve problemas sin escalar todo, tiene criterio propio |
| 7 | **Compromiso con la Marca** | 💜 | Cuida la imagen, propone mejoras, se siente parte |
| 8 | **Actitud y Presencia** | ✨ | Sonrisa, energía positiva, hospitalidad, "la camiseta puesta" |

---

## Rúbricas Detalladas (1 / 3 / 5)

### 1. Comunicación y Reportes 💬
| Score | Descripción |
|-------|-------------|
| **1** | No reporta novedades; avisa tarde o nunca; mensajes confusos sin contexto; hay que perseguirlo para obtener info |
| **3** | Comunica lo importante pero a veces incompleto; responde aunque con demora; le falta iniciativa |
| **5** | Comunica proactivamente con claridad y evidencia; responde rápido; anticipa problemas; propone soluciones |

### 2. Disponibilidad y Predisposición 📲 (NUEVA)
| Score | Descripción |
|-------|-------------|
| **1** | No responde fuera de horario nunca; pone trabas ante urgencias; inflexible; "eso no me corresponde" |
| **3** | Responde cuando puede pero con demora; acepta urgencias sin entusiasmo; disponibilidad limitada |
| **5** | Responde rápido ante urgencias reales; flexible sin que le pidan; entiende que el rol tiene responsabilidad extra |

### 3. Liderazgo y Clima de Equipo 👥
| Score | Descripción |
|-------|-------------|
| **1** | Mal clima; conflictos frecuentes no resueltos; el equipo se queja de él/ella; alta rotación |
| **3** | Clima aceptable; maneja lo básico; algunos roces sin resolver; el equipo lo respeta a medias |
| **5** | Equipo motivado y estable; resuelve conflictos; liderazgo sano; baja rotación; el equipo lo sigue |

### 4. Desarrollo del Staff 📚
| Score | Descripción |
|-------|-------------|
| **1** | No entrena; no hace coachings; la gente "aprende sola"; no da feedback constructivo |
| **3** | Capacita cuando le sobra tiempo; hace algunos coachings pero sin rutina ni seguimiento |
| **5** | Tiene rutina de entrenamiento; hace coachings mensuales; da feedback continuo; el equipo crece |

### 5. Adaptación a Cambios 🔄
| Score | Descripción |
|-------|-------------|
| **1** | Resiste todo cambio; se queja públicamente; demora implementaciones; contagia negatividad al equipo |
| **3** | Acepta cambios sin entusiasmo; implementa con ayuda; no propone mejoras |
| **5** | Lidera el cambio; entrena al equipo rápido; sostiene el nuevo estándar; propone mejoras activamente |

### 6. Resolución Autónoma de Problemas 🔧
| Score | Descripción |
|-------|-------------|
| **1** | Escala absolutamente todo; no propone soluciones; espera que otros resuelvan; depende de la marca |
| **3** | Resuelve problemas típicos; escala lo complejo con contexto; a veces necesita guía |
| **5** | Resuelve con criterio propio; documenta para que no se repita; casi no necesita escalar |

### 7. Compromiso con la Marca 💜
| Score | Descripción |
|-------|-------------|
| **1** | Desconectado de la marca; actitud de "empleado"; no cuida imagen ni estándares; le da igual |
| **3** | Cumple con lo pedido; actitud neutral; hace su trabajo pero sin ir más allá |
| **5** | Se siente dueño; propone mejoras; cuida la marca como propia; orgullo visible |

### 8. Actitud y Presencia ✨ (NUEVA)
| Score | Descripción |
|-------|-------------|
| **1** | Actitud negativa visible; sin energía; cara larga; no transmite hospitalidad; el equipo lo nota |
| **3** | Actitud correcta pero sin brillo; cumple pero no contagia entusiasmo |
| **5** | Energía positiva; sonrisa genuina; transmite hospitalidad; "la camiseta puesta"; contagia al equipo |

---

## Cambios Técnicos

### 1. Migración de Base de Datos

```sql
-- Eliminar las 6 actuales e insertar 8 nuevas con rúbricas más detalladas
DELETE FROM manager_competencies;

INSERT INTO manager_competencies (key, name, category, rubric_1, rubric_3, rubric_5, icon, sort_order)
VALUES 
  ('comunicacion_reportes', 'Comunicación y Reportes', 'marca', 
   'No reporta novedades; avisa tarde o nunca; mensajes confusos sin contexto; hay que perseguirlo.',
   'Comunica lo importante pero a veces incompleto; responde aunque con demora; le falta iniciativa.',
   'Comunica proactivamente con claridad y evidencia; responde rápido; anticipa problemas; propone soluciones.',
   '💬', 1),
   
  ('disponibilidad_predisposicion', 'Disponibilidad y Predisposición', 'marca', 
   'No responde fuera de horario nunca; pone trabas ante urgencias; inflexible; "eso no me corresponde".',
   'Responde cuando puede pero con demora; acepta urgencias sin entusiasmo; disponibilidad limitada.',
   'Responde rápido ante urgencias reales; flexible sin que le pidan; entiende la responsabilidad del rol.',
   '📲', 2),
   
  -- ... (las otras 6)
```

### 2. Corregir cálculo del promedio

El promedio debe calcularse sobre las competencias **puntuadas**, no sobre el total:

```typescript
// ManagerScoreHeader.tsx
const average = filledCount > 0 ? totalScore / filledCount : 0;
```

### 3. Ajustar escala

- **Máximo total**: 8 x 5 = **40 puntos**
- **Promedio**: 1 a 5 (solo sobre las puntuadas)

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `manager_competencies` (tabla) | Insertar 8 categorías con rúbricas específicas |
| `ManagerScoreHeader.tsx` | Corregir cálculo del promedio + actualizar máximo a 40 |
| `CoachingManagerForm.tsx` | Pasar `filledCount` correcto al header |

---

## Resultado Visual

```text
📊 SCORECARD DE ENCARGADO
━━━━━━━━━━━━━━━━━━━━━━━━━━

Total: 32/40  │  Promedio: 4.0/5

🏢 Evaluación desde Marca

💬 Comunicación y Reportes        [1] [2] [3] [4] [5]  ℹ️
📲 Disponibilidad y Predisposición [1] [2] [3] [4] [5]  ℹ️  ← NUEVA
👥 Liderazgo y Clima               [1] [2] [3] [4] [5]  ℹ️
📚 Desarrollo del Staff            [1] [2] [3] [4] [5]  ℹ️
🔄 Adaptación a Cambios            [1] [2] [3] [4] [5]  ℹ️
🔧 Resolución Autónoma             [1] [2] [3] [4] [5]  ℹ️
💜 Compromiso con la Marca         [1] [2] [3] [4] [5]  ℹ️
✨ Actitud y Presencia             [1] [2] [3] [4] [5]  ℹ️  ← NUEVA
```

---

## Beneficios

1. **Más específico**: Las rúbricas describen comportamientos concretos, no genéricos
2. **Predisposición laboral**: Ahora se evalúa la disponibilidad y flexibilidad
3. **Actitud visible**: Captura el "aura", la sonrisa, la energía
4. **Cálculo correcto**: El promedio refleja solo lo que se puntuó
5. **Accionable**: La encargada sabe exactamente qué mejorar en cada punto


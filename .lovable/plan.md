

# Plan: Scorecard de Encargados Estilo McDonald's

## Resumen del Cambio

Migrar de 7 competencias genéricas a **12 categorías específicas** con rúbricas claras (qué significa un 1, 3 y 5 en cada una), basado en los dolores reales que has tenido con encargados: turno, calidad, stock, actitud, etc.

---

## Las 12 Categorías Propuestas

| # | Categoría | Qué mide | Por qué importa |
|---|-----------|----------|-----------------|
| 1 | **Gestión del Turno** | Roles, picos, tiempos, ritmo, cierre | El 80% de los problemas pasan acá |
| 2 | **Calidad del Producto** | Punto carne, armado, temperatura, presentación | Es tu marca |
| 3 | **Higiene & BPM** | Limpieza, orden, frío/calor, seguridad alimentaria | Riesgo alto |
| 4 | **Cumplimiento Operativo** | Checklists, aperturas/cierres, disciplina | Sin esto no escala |
| 5 | **Servicio & Hospitalidad** | Actitud, sonrisa, calidez, trato | Experiencia cliente |
| 6 | **Ejecución por Canal** | Salón/Take/Delivery: tiempos, errores, packaging | Multi-canal |
| 7 | **Caja & Control** | Arqueos, diferencias, medios de pago, cierres | Plata |
| 8 | **Stock & Proveedores** | Previsión, pedidos, recepción, faltantes, rotación | Sin CDP igual importa |
| 9 | **Merma y Desperdicio** | Errores producción, vencimientos, porcionado | Rentabilidad |
| 10 | **Liderazgo de Equipo** | Clima, orden, respeto, exigencia sana | Retención |
| 11 | **Desarrollo del Equipo** | Entrenamiento, onboarding, polivalencia | Escalabilidad |
| 12 | **Adaptación a Cambios** | Adopción de cambios, mejora continua | Tu operación cambia siempre |

---

## Rúbricas Claras (Botón "i" de cada categoría)

Cada categoría tendrá una descripción detallada de qué significa 1, 3 y 5:

### Ejemplo: Gestión del Turno

| Puntaje | Descripción |
|---------|-------------|
| **1** | Desorden: no hay plan, se apagan incendios, roles confusos, tiempos altos |
| **3** | Correcto: el turno sale "bien" pero con baches y sin método estable |
| **5** | Profesional: planifica picos, asigna roles, controla tiempos, cierre impecable |

### Ejemplo: Servicio & Hospitalidad

| Puntaje | Descripción |
|---------|-------------|
| **1** | Trato frío/duro, no cuida al cliente, reclamos o mala energía |
| **3** | Correcto: atiende bien pero sin consistencia |
| **5** | Hospitalidad real: saluda, contiene, resuelve y deja al cliente mejor |

---

## Cambios en la UI

### Header con Score Total

```text
┌─────────────────────────────────────────────────────┐
│  [Avatar] María Gómez                               │
│  📍 Manantiales · Evaluación de Encargado           │
│                                                     │
│  TOTAL: 42/60  │  PROMEDIO: 3.5/5  │  ⬆ +0.3       │
│                    ████████░░░                      │
└─────────────────────────────────────────────────────┘
```

### Categorías en Secciones Agrupadas

```text
📋 OPERACIÓN DIARIA
├── Gestión del Turno .......... [1] [2] [3] [4] [5]  ℹ️
├── Ejecución por Canal ........ [1] [2] [3] [4] [5]  ℹ️
└── Atención de Crisis ......... [1] [2] [3] [4] [5]  ℹ️

🍔 ESTÁNDAR DE MARCA
├── Calidad del Producto ....... [1] [2] [3] [4] [5]  ℹ️
├── Higiene & BPM .............. [1] [2] [3] [4] [5]  ℹ️
└── Cumplimiento Operativo ..... [1] [2] [3] [4] [5]  ℹ️

💰 NEGOCIO Y CONTROL
├── Caja & Control ............. [1] [2] [3] [4] [5]  ℹ️
├── Stock & Proveedores ........ [1] [2] [3] [4] [5]  ℹ️
└── Merma y Desperdicio ........ [1] [2] [3] [4] [5]  ℹ️

👥 PERSONAS Y CULTURA
├── Servicio & Hospitalidad .... [1] [2] [3] [4] [5]  ℹ️
├── Liderazgo de Equipo ........ [1] [2] [3] [4] [5]  ℹ️
├── Desarrollo del Equipo ...... [1] [2] [3] [4] [5]  ℹ️
└── Adaptación a Cambios ....... [1] [2] [3] [4] [5]  ℹ️
```

### Semáforo de Resultado

| Promedio | Color | Significado |
|----------|-------|-------------|
| 4.5 - 5.0 | 🟣 Púrpura | Excelente |
| 3.5 - 4.4 | 🔵 Azul | Muy bien |
| 2.5 - 3.4 | 🟢 Verde | Bien / A mejorar |
| 1.5 - 2.4 | 🟡 Amarillo | Alerta |
| 1.0 - 1.4 | 🔴 Rojo | Crítico |

---

## Cambios en Base de Datos

### 1. Agregar columnas a `manager_competencies`

```sql
ALTER TABLE manager_competencies 
ADD COLUMN category TEXT,           -- 'operacion', 'estandar', 'negocio', 'personas'
ADD COLUMN rubric_1 TEXT,           -- Descripción del puntaje 1
ADD COLUMN rubric_3 TEXT,           -- Descripción del puntaje 3
ADD COLUMN rubric_5 TEXT,           -- Descripción del puntaje 5
ADD COLUMN icon TEXT DEFAULT '📊';  -- Emoji/icono
```

### 2. Poblar las 12 categorías

Reemplazar las 7 competencias actuales por las 12 nuevas con sus rúbricas completas.

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `manager_competencies` (tabla) | Agregar columnas + 12 nuevas categorías con rúbricas |
| `src/types/coaching.ts` | Agregar `category`, `rubric_1/3/5`, `icon` al tipo |
| `src/components/coaching/CoachingManagerSection.tsx` | Agrupar por categoría, mostrar rúbricas en tooltip |
| `src/components/coaching/CoachingManagerForm.tsx` | Mostrar total/promedio con barra visual |

---

## Vista del Encargado (Lo que VE ella)

El encargado podrá ver en su perfil:

```text
📊 MI SCORECARD DE ENCARGADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Enero 2026: 42/60 (3.5 promedio)

  Operación     ████████░░ 3.7
  Estándar      ██████████ 4.2
  Negocio       ██████░░░░ 3.0  ⚠️ Foco del mes
  Personas      ████████░░ 3.8

Top Fortalezas:
✓ Calidad del producto
✓ Higiene & BPM

Áreas de Mejora:
→ Stock & Proveedores (faltantes críticos)
→ Merma y Desperdicio

Plan de Acción:
1. Revisión stock 18:00 + pedido con buffer
2. Control FIFO semanal
```

---

## Beneficios

1. **Claridad total**: La encargada sabe exactamente qué piensa la marca de cada área
2. **Sin discusiones**: Las rúbricas definen qué es un 1, 3 y 5
3. **Accionable**: Identifica automáticamente las 2 categorías más bajas
4. **Transparente**: Mismo criterio para todos los locales
5. **Histórico**: Puede ver evolución mes a mes

---

## Testing Recomendado

1. Verificar que las 12 categorías se muestran agrupadas correctamente
2. Probar el tooltip de rúbrica en cada categoría
3. Verificar cálculo de total y promedio
4. Confirmar que el encargado puede ver su scorecard en Mi Cuenta
5. Probar en móvil que las secciones sean scrolleables


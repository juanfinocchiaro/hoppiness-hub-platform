# ARQUITECTURA DE BASE DE DATOS - HOPPINESS HUB

## DOCUMENTO DE REFERENCIA OBLIGATORIO

Este documento define la arquitectura oficial del sistema. **Lovable debe leer este documento antes de crear o modificar cualquier tabla, política RLS, o función.**

---

## 1. PROBLEMAS ACTUALES DE NOMENCLATURA

### Tablas con nombres confusos o redundantes

| Nombre Actual | Problema | Nombre Sugerido |
|---------------|----------|-----------------|
| `user_roles_v2` | El "v2" indica que hubo un v1, confuso | `brand_roles` |
| `user_branch_roles` | Correcto pero largo | `branch_roles` |
| `clock_entries` | OK pero podría ser más claro | `clock_logs` o `attendance_logs` |
| `employee_data` | Muy genérico, ¿qué data? | `employee_profiles` o `hr_employee_info` |
| `employee_schedules` | OK | OK |
| `branch_closure_config` | Confuso con `brand_closure_config` | `branch_closure_settings` |
| `brand_closure_config` | Confuso con `branch_closure_config` | `closure_field_definitions` |
| `shift_closures` | OK | OK |
| `special_days` | ¿Qué son? ¿Feriados? | `holidays` |

### Funciones con nombres inconsistentes

| Nombre Actual | Problema | Nombre Sugerido |
|---------------|----------|-----------------|
| `is_hr_for_branch` | ¿Qué es "HR"? | `can_manage_team` |
| `is_hr_role` | Mismo problema | `is_manager_role` |
| `is_financial_for_branch` | OK pero largo | `can_view_finances` |
| `is_cashier_for_branch` | OK | OK |
| `get_brand_role` | OK | OK |
| `get_local_role` | Debería ser `get_branch_role` | `get_branch_role` |
| `get_local_role_for_branch` | Redundante | Eliminar, usar `get_branch_role` |
| `can_access_branch` | OK | OK |
| `user_has_branch_access` | Duplicado de `can_access_branch` | Eliminar |
| `has_branch_role` | ¿Diferencia con `can_access_branch`? | Unificar |

---

## 2. ARQUITECTURA PROPUESTA

### 2.1 Sistema de Roles (DEFINITIVO)

```
┌─────────────────────────────────────────────────────────────┐
│                    SISTEMA DE ROLES                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  brand_roles (antes user_roles_v2)                         │
│  ├── user_id (único por usuario)                           │
│  ├── brand_role: superadmin | coordinador | informes |     │
│  │               contador_marca | NULL                      │
│  └── is_active                                              │
│                                                             │
│  branch_roles (antes user_branch_roles)                    │
│  ├── user_id + branch_id (compuesto)                       │
│  ├── local_role: franquiciado | encargado | contador_local │
│  │               | cajero | empleado                        │
│  └── is_active                                              │
│                                                             │
│  REGLA: Un usuario puede tener:                            │
│  - 0 o 1 brand_role (rol de marca)                         │
│  - 0 a N branch_roles (un rol por sucursal)                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Jerarquía de Entidades

```
MARCA (Hoppiness)
│
├── branches (sucursales)
│   ├── branch_shifts (turnos del local)
│   ├── branch_closure_settings (config de cierre)
│   └── shift_closures (cierres de turno)
│
├── PERSONAS
│   ├── profiles (datos básicos de auth)
│   ├── brand_roles (roles de marca)
│   ├── branch_roles (roles por sucursal)
│   ├── employee_profiles (datos HR: DNI, CBU, etc.)
│   ├── employee_schedules (horarios programados)
│   ├── clock_logs (fichajes)
│   ├── salary_advances (adelantos)
│   └── warnings (apercibimientos)
│
├── COMUNICACIÓN
│   ├── communications (comunicados)
│   ├── communication_reads (lecturas)
│   ├── contact_messages (mensajes del público)
│   └── staff_invitations (invitaciones)
│
├── DOCUMENTOS
│   ├── regulations (reglamentos)
│   └── regulation_signatures (firmas)
│
└── CONFIGURACIÓN
    ├── closure_field_definitions (campos de cierre)
    ├── holidays (feriados/días especiales)
    └── audit_logs (auditoría)
```

### 2.3 Vistas Públicas (sin RLS)

```
branches_public  → Vista pública de sucursales (para landing)
profiles_public  → Vista pública de perfiles (nombre, avatar)
```

---

## 3. REGLAS DE RLS - CRÍTICO

### 3.1 NUNCA hacer esto (recursión infinita)

```sql
-- ❌ MAL: Política que consulta la misma tabla
CREATE POLICY "bad_policy" ON branch_roles
  USING (
    EXISTS (SELECT 1 FROM branch_roles WHERE ...) -- RECURSIÓN!
  );
```

### 3.2 SIEMPRE hacer esto

```sql
-- ✅ BIEN: Usar función SECURITY DEFINER

-- Paso 1: Crear función que bypasea RLS
CREATE OR REPLACE FUNCTION can_manage_branch(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM branch_roles
    WHERE user_id = _user_id 
    AND branch_id = _branch_id
    AND local_role IN ('encargado', 'franquiciado')
    AND is_active = true
  )
$$;

-- Paso 2: Política que usa la función
CREATE POLICY "branch_roles_managers" ON branch_roles
  FOR ALL TO authenticated
  USING (can_manage_branch(auth.uid(), branch_id));
```

### 3.3 Funciones helper oficiales

| Función | Propósito | Retorna |
|---------|-----------|---------|
| `is_superadmin(user_id)` | ¿Es superadmin? | boolean |
| `get_brand_role(user_id)` | Obtener rol de marca | text |
| `get_branch_role(user_id, branch_id)` | Obtener rol en sucursal | text |
| `can_access_branch(user_id, branch_id)` | ¿Puede acceder a sucursal? | boolean |
| `can_manage_branch(user_id, branch_id)` | ¿Puede gestionar equipo? | boolean |
| `can_view_finances(user_id, branch_id)` | ¿Puede ver finanzas? | boolean |

---

## 4. CONVENCIONES DE NOMENCLATURA

### 4.1 Tablas

```
FORMATO: [entidad]_[especificador opcional]

Ejemplos:
- branches (no "branch" singular)
- branch_shifts (turnos de sucursal)
- clock_logs (registros de fichaje)
- salary_advances (adelantos de sueldo)
```

### 4.2 Funciones

```
FORMATO: [verbo]_[sustantivo]

Verbos permitidos:
- is_    → Retorna boolean (is_superadmin, is_active_user)
- can_   → Retorna boolean de permiso (can_access, can_manage)
- get_   → Retorna valor (get_brand_role, get_branch_name)
- has_   → Retorna boolean de existencia (has_branch_role)

Ejemplos:
- is_superadmin(user_id) ✅
- can_manage_branch(user_id, branch_id) ✅
- get_branch_role(user_id, branch_id) ✅
```

### 4.3 Políticas RLS

```
FORMATO: [tabla]_[operación]_[quien]

Ejemplos:
- branch_roles_select_own (leer propios)
- branch_roles_select_managers (managers leen todos)
- branch_roles_insert_managers (solo managers insertan)
- clock_logs_select_branch (ver fichajes del local)
```

---

## 5. MIGRACIÓN PROPUESTA

### Fase 1: Renombrar sin romper (usando vistas)

```sql
-- Crear vista con nombre nuevo que apunta a tabla vieja
CREATE VIEW brand_roles AS SELECT * FROM user_roles_v2;
CREATE VIEW branch_roles AS SELECT * FROM user_branch_roles;

-- Código puede usar ambos nombres durante transición
```

### Fase 2: Migrar código gradualmente

1. Actualizar hooks para usar nuevos nombres
2. Actualizar componentes uno por uno
3. Tests después de cada cambio

### Fase 3: Eliminar tablas viejas

1. Verificar que nada usa nombres viejos
2. Drop views
3. Rename tables
4. Recrear views si hay dependencias externas

---

## 6. CHECKLIST ANTES DE CREAR ALGO NUEVO

### Nueva tabla
- [ ] ¿El nombre sigue la convención [entidad]_[especificador]?
- [ ] ¿Ya existe una tabla similar? (buscar antes de crear)
- [ ] ¿Necesita RLS? Si sí, diseñar políticas SIN recursión
- [ ] ¿Necesita índices para las queries comunes?

### Nueva función
- [ ] ¿El nombre sigue la convención [verbo]_[sustantivo]?
- [ ] ¿Ya existe una función similar? (no duplicar)
- [ ] Si consulta tablas con RLS, ¿necesita SECURITY DEFINER?

### Nueva política RLS
- [ ] ¿La política consulta la misma tabla que protege? → ❌ PROHIBIDO
- [ ] ¿Usa funciones helper existentes?
- [ ] ¿El nombre sigue [tabla]_[operación]_[quien]?

---

## 7. DÓNDE GUARDAR ESTE DOCUMENTO

### Opción A: En el repositorio

Crear archivo: `docs/ARCHITECTURE.md`

Ventaja: Siempre disponible, versionado con el código.

### Opción B: En Lovable como contexto

En la configuración del proyecto de Lovable, hay una sección de "Project Context" o "Custom Instructions". Pegar ahí un resumen.

### Opción C: Como comment en el prompt

Incluir al inicio de cada prompt importante:

```
Antes de hacer cambios, lee docs/ARCHITECTURE.md
```

---

## 8. RESUMEN EJECUTIVO

| Aspecto | Regla |
|---------|-------|
| **Roles de marca** | Tabla `brand_roles`, 1 por usuario |
| **Roles de sucursal** | Tabla `branch_roles`, 1 por usuario/sucursal |
| **RLS** | NUNCA recursivo, SIEMPRE con funciones SECURITY DEFINER |
| **Nomenclatura tablas** | `entidad_especificador` en plural |
| **Nomenclatura funciones** | `verbo_sustantivo` (is_, can_, get_, has_) |
| **Antes de crear** | Verificar que no existe algo similar |

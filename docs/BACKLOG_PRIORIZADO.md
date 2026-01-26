# Backlog Priorizado - Hoppiness Hub

**Fecha:** 2026-01-26
**Auditoría:** Post-migración V2

---

## 🔴 QUICK WINS (1-2 horas c/u)

| # | Problema | Evidencia | Archivo(s) | Solución |
|---|----------|-----------|------------|----------|
| 1 | Hooks legacy aún existen | `useUserRole.tsx`, `useUserRoles.ts` | `src/hooks/` | Marcar como `@deprecated`, programar eliminación |
| 2 | Warning en consola: Function components cannot be given refs | `PublicHeader.tsx` → DropdownMenu | `src/components/layout/PublicHeader.tsx` | Agregar `forwardRef` o usar `asChild` |
| 3 | React Router Future Flag Warning | `v7_relativeSplatPath` | `src/App.tsx` | Agregar flag en `<BrowserRouter>` |
| 4 | RegistroStaff crea en `user_roles` legacy | Línea de insert | `src/pages/RegistroStaff.tsx` | Cambiar a `user_roles_v2` |

---

## 🟡 FIXES DE FONDO (2-4 horas c/u)

| # | Problema | Evidencia | Archivo(s) | Solución |
|---|----------|-----------|------------|----------|
| 5 | Error 404 en proveedores | Query con branchId undefined | `LocalComprasProveedores.tsx:92` | Agregar guard `if (!branchId) return` |
| 6 | CuentaDashboard no detecta empleado correctamente | Solo muestra cliente | `CuentaDashboard.tsx` | Usar `employees` table para detectar rol operativo |
| 7 | Mi Cuenta falta secciones de empleado | Fichajes, adelantos, apercibimientos | `CuentaDashboard.tsx` | Importar componentes existentes |
| 8 | Usuarios de prueba sin branch_ids | No pueden entrar a Mi Local | DB: `user_roles_v2` | SQL UPDATE para asignar Manantiales |
| 9 | LocalIntegraciones duplica lógica | Similar a LocalConfig | Ambos archivos | Considerar refactor a componentes compartidos |
| 10 | UserCard usa tablas legacy | `user_roles`, `user_panel_access` | `UserCard.tsx` | Migrar a `user_roles_v2` |
| 11 | Error: column orders.invoice_id does not exist | Postgres logs | Query antigua | Actualizar queries que referencian columna removida |

---

## 🟢 MEJORAS (4-8 horas c/u)

| # | Problema | Evidencia | Impacto | Solución |
|---|----------|-----------|---------|----------|
| 12 | Sin protección granular en rutas | Rutas no verifican permisos específicos | Seguridad | Crear `<RequirePermission permission="xxx">` |
| 13 | Combos no implementados | Pantalla placeholder | UX | Implementar lógica de combos en menú |
| 14 | Sistema de compras básico | Sin alertas automáticas | Operación | Implementar cálculo de stock sugerido |
| 15 | P&L no configurable | Categorías hardcoded | Finanzas | Permitir editar categorías desde Mi Marca |
| 16 | Landing sin sección "Sumate" | Falta franquicias/empleo/proveedores | Marketing | Agregar sección con modales |
| 17 | Productividad no implementada | Documentada pero sin UI | RRHH | Crear función SQL + pantalla |
| 18 | Recuperar contraseña incompleto | Flujo básico | Auth | Mejorar UX y emails |

---

## 📊 DEUDA TÉCNICA

| # | Tipo | Descripción | Archivos |
|---|------|-------------|----------|
| T1 | Colores hardcoded | `bg-red-100`, `bg-blue-500` en vez de tokens | 50+ archivos |
| T2 | Archivos muy largos | `EmployeeScheduleEditor` 1155 líneas | Refactor a hooks/componentes |
| T3 | Tablas legacy | `user_roles`, `user_panel_access`, `user_branch_access` | Migración pendiente |
| T4 | Queries sin error handling | Muchas queries sin `.catch()` | Todo el proyecto |

---

## 📅 ORDEN SUGERIDO DE EJECUCIÓN

### Semana 1: Estabilización
1. Quick wins 1-4
2. Fixes 5-8 (errores críticos)

### Semana 2: Seguridad
3. Fix 10 (UserCard)
4. Mejora 12 (RequirePermission)
5. Deuda T3 (migrar tablas legacy)

### Semana 3: Funcionalidades
6. Mejora 13 (Combos)
7. Mejora 16 (Landing Sumate)
8. Mejora 17 (Productividad)

### Semana 4: Refinamiento
9. Fixes 9, 11
10. Mejoras 14, 15, 18
11. Deuda técnica T1, T2, T4

---

## ✅ COMPLETADO EN ESTA ITERACIÓN

| Cambio | Archivos | Estado |
|--------|----------|--------|
| SQL: `has_branch_access` usa `user_roles_v2` | `migrations/` | ✅ |
| SQL: `is_admin` usa `user_roles_v2` | `migrations/` | ✅ |
| 25 archivos migrados a `usePermissionsV2` | `src/pages/`, `src/components/` | ✅ |
| Verificación POS/Caja funcional | Manual testing | ✅ |
| Inventario de rutas creado | `docs/INVENTARIO_RUTAS_PERMISOS.md` | ✅ |
| Backlog priorizado | `docs/BACKLOG_PRIORIZADO.md` | ✅ |

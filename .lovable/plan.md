
# Login Modal en lugar de pagina separada

## Objetivo
Reemplazar la navegacion a `/ingresar` (pagina completa) con un modal/dialog que se superpone sobre la pagina actual, evitando que el usuario pierda su contexto.

## Arquitectura

### 1. Crear `AuthModal.tsx` — Componente reutilizable
**Archivo nuevo**: `src/components/auth/AuthModal.tsx`

- Un `Dialog` (Radix) que contiene todo el formulario de login/registro actual de `Ingresar.tsx`
- Props: `open`, `onOpenChange`, `onSuccess?: () => void`
- Incluye: Google OAuth, tabs Login/Registro, validacion con Zod
- Al autenticarse exitosamente: cierra el modal y ejecuta `onSuccess` (sin navegar)
- NO incluye el fondo gradient ni el header "Volver al inicio" (eso es de la pagina completa)
- Mantiene el logo, las tabs, y todo el contenido del card blanco

### 2. Crear contexto `AuthModalContext`
**Archivo nuevo**: `src/contexts/AuthModalContext.tsx`

- Provee `openAuthModal()` y `closeAuthModal()` globalmente
- Permite que cualquier componente (header, checkout, guards) abra el modal sin navegar
- Mantiene estado `isOpen` y un callback `onSuccess` opcional

### 3. Integrar el Provider en `App.tsx`
- Envolver la app con `AuthModalProvider`
- Renderizar `AuthModal` una sola vez a nivel global

### 4. Actualizar puntos de disparo

| Archivo | Cambio |
|---------|--------|
| `UserMenuDropdown.tsx` | En lugar de `navigate('/ingresar')`, llamar `openAuthModal()` |
| `WebappHeader.tsx` | Sin cambios directos (ya delega en UserMenuDropdown) |
| `PublicHeader.tsx` | Boton "Ingresar" llama `openAuthModal()` en vez de `Link to="/ingresar"` |
| `PublicFooter.tsx` | Link "Ingresar" llama `openAuthModal()` |

### 5. Mantener la pagina `/ingresar` como fallback
- La ruta `/ingresar` sigue existiendo para:
  - Links directos / bookmarks
  - Redireccion desde `RequireAuth` (guards de rutas protegidas)
  - Flujo de "Olvide contrasena" y "Reset password"
- NO se elimina, solo deja de ser el camino principal

### 6. RequireAuth: mejorar para webapp
- En contexto de la webapp publica (`/pedir/*`), en vez de redirigir a `/ingresar`, abrir el modal
- Para rutas protegidas del backoffice (`/milocal`, `/mimarca`, `/cuenta`), mantener redirect normal

## Detalle tecnico

### AuthModal contenido
- Logo centrado
- Boton "Continuar con Google" (usando `lovable.auth.signInWithOAuth`)
- Separador "o con email"
- Tabs: Iniciar Sesion / Registrarse
- Formularios identicos a los actuales
- Al login exitoso: `onOpenChange(false)` + toast de exito

### Archivos modificados
| Archivo | Tipo | Descripcion |
|---------|------|-------------|
| `src/components/auth/AuthModal.tsx` | Crear | Dialog con formulario login/registro |
| `src/contexts/AuthModalContext.tsx` | Crear | Context global para abrir/cerrar el modal |
| `src/App.tsx` | Modificar | Agregar AuthModalProvider |
| `src/components/webapp/UserMenuDropdown.tsx` | Modificar | Usar `openAuthModal()` |
| `src/components/layout/PublicHeader.tsx` | Modificar | Usar `openAuthModal()` |
| `src/components/layout/PublicFooter.tsx` | Modificar | Usar `openAuthModal()` |
| `src/pages/Ingresar.tsx` | Sin cambios | Se mantiene como fallback |

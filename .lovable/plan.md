

## Plan: Google OAuth en Popup (sin redirigir la página actual)

### Problema
Actualmente, al hacer click en "Ingresar con Google", la página completa redirige a Google y el usuario pierde el contexto de donde estaba. Queremos que se abra en una **ventana popup separada** que no afecte la pestaña actual.

> **Nota técnica**: No es posible mostrar la pantalla de Google *dentro* del modal (Google lo prohíbe por seguridad). La alternativa es abrir una ventana popup aparte que se cierre sola al completar el login.

### Cómo va a funcionar

1. El usuario hace click en "Ingresar con Google"
2. Se abre una **ventana popup pequeña** (500x600px)
3. El popup muestra la selección de cuenta de Google
4. Al completar el login, el popup **se cierra solo**
5. La página principal detecta que el usuario se autenticó y actualiza el estado

### Archivos a crear

**`src/pages/AuthPopup.tsx`** — Página mínima que se abre en el popup
- Llama a `lovable.auth.signInWithOAuth('google', { redirect_uri })` apuntando a sí misma
- Al volver del redirect de Google, detecta que hay sesión activa
- Envía un `postMessage` al `window.opener` y se cierra automáticamente

**`src/hooks/useGooglePopupAuth.ts`** — Hook reutilizable
- Función `signInWithGooglePopup()` que abre `window.open('/auth-popup', ...)`
- Escucha el `message` event del popup para saber cuándo terminó
- Fallback: si el popup es bloqueado por el navegador, usa redirect normal

### Archivos a modificar

**`src/components/auth/AuthModal.tsx`**
- Reemplazar el `onClick` del botón de Google para usar `signInWithGooglePopup()` del nuevo hook
- El resto del modal (login/signup con email) no cambia

**`src/components/webapp/PostPurchaseSignup.tsx`**
- Misma lógica: usar `signInWithGooglePopup()` en vez del redirect directo

**`src/pages/Ingresar.tsx`**
- Si tiene botón de Google, aplicar el mismo cambio

**Ruta nueva en el router** (en `App.tsx` o donde estén las rutas)
- Agregar ruta pública `/auth-popup` → `AuthPopup.tsx`

### Flujo técnico detallado

```text
┌─────────────────┐     window.open()      ┌──────────────┐
│  Página actual   │ ───────────────────►   │  Popup       │
│  (modal abierto) │                        │  /auth-popup │
│                  │                        │              │
│  Escucha         │     redirect           │  Llama OAuth │
│  postMessage     │                        │  → Google    │
│                  │                        │  → Callback  │
│                  │   ◄── postMessage ──── │  Cierra solo │
│  Detecta sesión  │                        └──────────────┘
│  Cierra modal    │
└─────────────────┘
```

### Manejo de errores
- **Popup bloqueado**: Si el navegador bloquea el popup, se hace fallback al redirect normal (comportamiento actual)
- **Popup cerrado manualmente**: Se detecta con polling de `window.closed` y se limpia el estado de loading


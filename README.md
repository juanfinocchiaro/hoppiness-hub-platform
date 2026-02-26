# Hoppiness Hub

Sistema integral de gestión para franquicias gastronómicas. Incluye POS, KDS, gestión de marca, locales, empleados, stock, finanzas y webapp de pedidos para clientes.

## Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind
- **Backend:** Supabase (PostgreSQL + Auth + Realtime + Edge Functions)
- **Facturación:** AFIP (Factura electrónica)

## Instalación

```bash
git clone [repo]
cd hoppiness-hub
npm install
cp .env.example .env.local
# Completar variables en .env.local
npm run dev
```

## Variables de entorno

Ver `.env.example` para la lista completa de variables necesarias.

## Scripts

```bash
npm run dev          # Desarrollo local
npm run build        # Build de producción
npm run preview      # Preview del build
npm run release      # Generar nueva versión + changelog
npm run docs:db      # Regenerar documentación de DB
```

## Estructura

```
src/
├── components/      # Componentes reutilizables
├── pages/           # Páginas de la aplicación
├── hooks/           # Custom hooks
├── lib/             # Utilidades y configuración
├── types/           # TypeScript types
└── integrations/    # Supabase client y tipos

supabase/
├── migrations/      # Schema de base de datos
└── functions/       # Edge Functions
```

## Documentación

- `BUSINESS_RULES.md` - Reglas de negocio
- `PERSONAS.md` - Usuarios y roles del sistema
- `CHANGELOG.md` - Historial de cambios
- `docs/DATABASE.md` - Schema de base de datos (auto-generado)
- `docs/API.md` - Edge Functions y endpoints
- `docs/DEPLOYMENT.md` - Guía de deployment

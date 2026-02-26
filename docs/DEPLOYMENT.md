# Deployment

## Ambientes

| Ambiente | URL | Supabase |
|----------|-----|----------|
| Desarrollo | localhost:5173 | Local o proyecto dev |
| Producción | [tu-dominio] | Proyecto producción |

## Deploy a producción

### Frontend (Vercel/Netlify)

1. Push a `main`
2. Deploy automático se dispara
3. Verificar build en el dashboard

### Base de datos (Supabase)

```bash
# Aplicar migraciones pendientes
supabase db push

# Ver qué se va a aplicar
supabase db push --dry-run
```

### Edge Functions

```bash
# Deploy de todas las funciones
supabase functions deploy

# Deploy de una función específica
supabase functions deploy emitir-factura
```

## Variables de entorno

Configurar en el dashboard de Vercel/Netlify:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Las variables de AFIP van en Supabase (secrets de Edge Functions).

## Rollback

### Frontend
- En Vercel/Netlify: Redeploy de un commit anterior

### Base de datos
- Restaurar backup desde Supabase dashboard
- O aplicar migración de rollback manual

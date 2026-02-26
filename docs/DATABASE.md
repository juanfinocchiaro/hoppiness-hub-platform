# Base de Datos

*Este archivo se genera automáticamente con `npm run docs:db`. No editar manualmente.*

*Última actualización: 2026-02-26*

## Tablas principales

### pedidos
Todos los pedidos del sistema.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | PK |
| branch_id | uuid | FK a branches |
| numero_dia | int | Número correlativo del día |
| canal | text | mostrador, delivery, rappi, etc |
| tipo_servicio | text | delivery, takeaway, presencial |
| estado | text | pendiente, confirmado, preparando, listo, entregado, cancelado |
| total | numeric | Total del pedido |
| created_at | timestamptz | Fecha de creación |

### productos
Catálogo de productos de la marca.

### branches
Sucursales/locales de la franquicia.

### customers
Clientes que han hecho pedidos.

### employees
Empleados de los locales.

---

Ver schema completo en `supabase/migrations/00000000000000_initial_schema.sql`

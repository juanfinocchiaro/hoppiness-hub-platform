# Personas - Hoppiness Hub

## Roles de Marca (Mi Marca)

### Superadmin
- **Quién:** Dueño de la franquicia
- **Acceso:** Todo el sistema
- **Puede:** Configurar marca, ver todas las sucursales, gestionar usuarios, ver finanzas consolidadas

### Coordinador
- **Quién:** Encargado de operaciones de la marca
- **Acceso:** Productos, sucursales, reportes
- **Puede:** Gestionar menú, ver estado de locales, enviar comunicaciones
- **No puede:** Configuración de marca, usuarios, finanzas sensibles

### Informes
- **Quién:** Analista, consultor externo
- **Acceso:** Solo lectura de reportes
- **Puede:** Ver dashboards, exportar datos
- **No puede:** Modificar nada

### Contador Marca
- **Quién:** Estudio contable
- **Acceso:** Finanzas consolidadas
- **Puede:** Ver P&L, facturación, impuestos de todos los locales
- **No puede:** Operación, productos, empleados

---

## Roles de Local (Mi Local)

### Franquiciado
- **Quién:** Dueño del local
- **Acceso:** Todo de su local
- **Puede:** Ver finanzas, gestionar empleados, configurar local, operar

### Encargado
- **Quién:** Responsable del turno
- **Acceso:** Operación completa
- **Puede:** POS, KDS, stock, horarios, compras
- **No puede:** Caja resguardo, configuración financiera

### Contador Local
- **Quién:** Contador del franquiciado
- **Acceso:** Finanzas del local
- **Puede:** Ver P&L, caja, facturación, liquidación
- **No puede:** Operación, empleados

### Cajero
- **Quién:** Atiende en caja
- **Acceso:** POS y caja
- **Puede:** Tomar pedidos, cobrar, ver KDS, cerrar turno
- **No puede:** Stock, empleados, finanzas, configuración

### Empleado / KDS
- **Quién:** Cocinero, ayudante
- **Acceso:** Mínimo
- **Puede:** Ver KDS, fichar entrada/salida, ver su cuenta
- **No puede:** POS, caja, nada más

---

## Usuarios Webapp (Clientes)

### Cliente con cuenta
- **Quién:** Cliente que se registró
- **Acceso:** Mi Cuenta
- **Puede:** Ver historial de pedidos, repetir pedidos, guardar direcciones, ver promos

### Cliente invitado (sin cuenta)
- **Quién:** Cliente que pide sin registrarse
- **Acceso:** Solo flujo de pedido
- **Puede:** Ver menú, armar carrito, hacer pedido, ver tracking con link
- **No puede:** Ver historial, guardar datos, acceder a promos exclusivas
- **Datos que da:** Nombre, teléfono, dirección (se guardan en customers para analytics)

# REGLAS DE NEGOCIO - HOPPINESS CLUB

> Este archivo define cómo funciona el negocio. NO inventes funcionalidades.
> Solo corregí/completá lo que YA existe basándote en estas reglas.

---

## 🎯 PRINCIPIO FUNDAMENTAL

**Si algo está a medio hacer, completalo siguiendo el patrón de cosas similares que SÍ funcionan.**
- NO agregues features nuevas sin autorización explícita
- NO cambies la arquitectura sin autorización explícita
- Si no hay ejemplo similar en el código, PREGUNTÁ antes de implementar

---

## 📍 CONTEXTO DEL NEGOCIO

- **Hoppiness** es una franquicia de hamburgueserías smash en Córdoba, Argentina
- Actualmente tiene **6 locales** operativos
- El sistema de ventas/POS es **Núcleo Check** (externo, no es esta app)
- Esta app gestiona: RRHH, finanzas internas, comunicación, supervisión
- Los datos de ventas se cargan manualmente desde Núcleo Check

---

## 👥 FICHAJES

### Reglas
- El empleado ficha con **PIN de 4 dígitos** único por persona
- El PIN se configura en el perfil del empleado
- El fichaje registra: **el fichaje solo debe hacerlo si está conectado a la misma IP desde el celular que la PC del negocio**
- Cada fichaje es de tipo **ENTRADA** o **SALIDA**
- Un empleado **NO puede fichar entrada si ya tiene una entrada abierta** (sin salida)
- Un empleado **NO puede fichar salida si no tiene entrada abierta**
- El fichaje es **por sucursal** (branch_id)
- El fichaje público se accede por URL: `/fichaje/{codigo_sucursal}`

### Tolerancias
- Llegadas tardes acumuladas: **más de 15 minutos** después del horario programado durante el mes, osea puede llegar en total 15 minutos tardes.
- Salida temprana: No existe, si terminan su tareas, se van.
- Estas tolerancias son configurables por sucursal

### GPS no lo vamos a usar más 
- 

---

## 📅 HORARIOS

### Reglas generales
- El encargado crea horarios **MENSUALES** por empleado
- Cada día tiene: **hora entrada, hora salida, o es FRANCO**
- **Franco = día libre asignado** (no es lo mismo que "no tener horario")
- Los horarios se deben publicar **antes del día 25** del mes anterior
- Al publicar, se **notifica automáticamente** al empleado

### Francos y feriados
- Cada empleado debe tener **mínimo 1 franco por semana** (ley laboral argentina)
- Los feriados nacionales se configuran a nivel marca
- Si un empleado trabaja en franco o feriado, esas horas son **100% extra**

### Solicitudes de días libres
- El empleado puede solicitar días libres
- Estados: **pendiente → aprobado / rechazado**
- Solo el encargado o franquiciado puede aprobar/rechazar
- Al aprobar, se debe reflejar en el horario (marcar como franco)
- Al rechazar, se debe indicar motivo (opcional pero recomendado)

### Modificaciones post-publicación
- El encargado puede modificar horarios ya publicados
- Toda modificación debe **notificar al empleado**
- Se guarda historial de quién modificó y cuándo

---

## ⏱ HORAS Y LIQUIDACIÓN

### Convenio colectivo
- Máximo **190 horas mensuales** antes de considerar extras
- Jornada máxima diaria: **9 horas**

### Cálculo de horas extra
- **Horas en franco/feriado:** Se pagan al **50% extra SIEMPRE**, sin importar el total mensual
- **Horas extra en día hábil:** Solo si el total del mes supera 190hs, o las 9hs en el día

### Tipos de contrato
- **100% BLANCO:** Empleado en relación de dependencia total
- **50% BLANCO:** Parte en blanco, parte en negro (común en gastronomía)
- **0% BLANCO:** Monotributista / informal
- El tipo de contrato afecta cómo se calcula y muestra la liquidación

### Productividad
- Métrica clave: **Hamburguesas vendidas ÷ Horas trabajadas del turno**
- Se puede calcular por turno, día, semana o mes
- Se usa para comparar eficiencia entre locales

---

## 💰 ADELANTOS DE SUELDO

### Flujo
1. Empleado solicita adelanto (monto + motivo opcional)
2. Encargado o franquiciado **aprueba o rechaza**
3. Si aprobado, se marca como **pagado** cuando se entrega el dinero
4. Se descuenta de la liquidación del mes

### Estados
- **pendiente:** Esperando aprobación
- **aprobado:** Aprobado pero no pagado aún
- **rechazado:** No se va a dar
- **pagado:** Ya se entregó el dinero

### Reglas
- No se puede aprobar un adelanto ya aprobado
- No se puede cancelar un adelanto ya pagado
- El monto no puede ser mayor a un monto que debe poder editarse según el franquiciado quiera sueldo estimado del mes

---

## ⚠️ APERCIBIMIENTOS (Warnings)

### Reglas
- Solo el encargado o franquiciado puede cargar apercibimientos
- Cada apercibimiento tiene: **fecha, motivo, descripción**
- El empleado lo ve en "Mi Cuenta". El encargado es apercibido por el franquiciado y lo ve en su cuenta también como encargado.
- **3 apercibimientos = posible despido** (solo informativo, no automático)
- Los apercibimientos NO se pueden eliminar, solo agregar notas

### Motivos predefinidos
- Llegada tarde reiterada
- Falta sin aviso
- Incumplimiento de uniforme
- Mal trato a cliente
- Mal trato a compañero
- Incumplimiento de procesos
- Otro (con descripción obligatoria)

---

## 🎯 COACHING (Evaluaciones)

### Estructura
- El encargado evalúa empleados en **competencias predefinidas**
- Puntaje **1 a 5** por competencia
- Se evalúan también **estaciones de trabajo** (plancha, caja, delivery, etc.)
- Se pueden otorgar **certificaciones** (ej: "Certificado en plancha")

### Competencias generales (ejemplo)
- Puntualidad
- Presentación personal
- Trabajo en equipo
- Atención al cliente
- Conocimiento del producto

### Estaciones de trabajo
- Plancha
- Armado
- Caja
- Delivery
- Limpieza
- Fritura
- Salón/Runner

### Frecuencia
- Mínimo **1 coaching por empleado por mes**
- El empleado puede ver su historial de coachings

---

## 🤝 REUNIONES

### Tipos
- **Reunión de equipo:** Encargado con sus empleados
- **Reunión de red:** Marca con encargados de todos los locales

### Flujo
1. Se agenda reunión con fecha, hora, participantes
2. Se envían invitaciones/notificaciones
3. Se realiza la reunión (presencial o virtual)
4. Se registran **acuerdos/compromisos** con responsables
5. Se cierra la reunión

### Estados
- **programada:** Agendada, pendiente de realizarse
- **en_curso:** Se está llevando a cabo
- **cerrada:** Finalizada con acuerdos registrados
- **cancelada:** No se realizó

### Acuerdos
- Cada acuerdo tiene: descripción, responsable(s), fecha límite
- Se puede marcar como **cumplido** o **pendiente**
- Los acuerdos pendientes aparecen como recordatorio

---

## 📢 COMUNICADOS

### Tipos
- **info:** Información general
- **warning:** Advertencia importante
- **urgent:** Urgente, requiere atención inmediata
- **celebration:** Celebración, logro, felicitación

### Alcance
- **De marca:** Va a todos los locales o a locales específicos
- **De local:** Va solo al equipo del local.

### Destinatarios
- Se puede enviar a **roles específicos** (ej: solo encargados), o también solo cajeros de parte de los encargados.
- Se puede enviar a **todos**
- El empleado marca como "leído"


---

## 📋 REGLAMENTOS

### Reglas
- La marca sube PDFs de reglamentos
- Los empleados **deben firmar** (subir foto/escaneo de firma)
- Se trackea: quién firmó, cuándo, qué versión
- Si el reglamento se actualiza, los empleados deben firmar de nuevo

### Estados de firma
- **pendiente:** No firmó aún
- **firmado:** Ya firmó esta versión

---

## 🏪 PROVEEDORES Y COMPRAS

### Proveedores
- Los proveedores son **de MARCA** (todos los locales los ven)
- Cada proveedor tiene: nombre, CUIT, contacto, condiciones de pago
- Cada local puede tener **condiciones propias** (precio negociado, plazo)

### Facturas de compra
- Las carga el **encargado** (no el contador local)
- Cada factura tiene: proveedor, fecha, número, items, total
- Estados: **pendiente, pago_parcial, pagado**

### Pagos
- Se registran pagos contra facturas
- Un pago puede aplicarse a **múltiples facturas**
- El saldo pendiente se actualiza automáticamente
- **Cuenta corriente** = Facturas - Pagos

### Pagos a cuenta
- Se puede registrar un pago **sin asociar a factura específica**
- Queda como saldo a favor para futuras facturas

---

## 💸 GASTOS OPERATIVOS

### Reglas
- Son gastos del local que **no son compras a proveedor**
- Ejemplos: delivery, reparaciones menores, artículos de limpieza
- Los carga el encargado (gastos menores) o franquiciado (gastos mayores)
- Tienen: categoría, monto, fecha, comprobante (opcional)

### Categorías
- Delivery/Fletes
- Mantenimiento
- Limpieza
- Varios
- Otro

### Autorización
- Gastos menores (< $X): Encargado puede cargar solo
- Gastos mayores (>= $X): Requiere aprobación del franquiciado
- El umbral X es configurable por local

---

## 💵 CIERRES DE TURNO Este modulo no servirá mas una vez que tengamos le POS

### Qué se carga
- **Ventas por canal:** Efectivo, Tarjeta débito, Tarjeta crédito, MercadoPago QR, Transferencia
- **Ventas por app:** Rappi, PedidosYa, MercadoPago Delivery
- **Arqueo de caja:** Conteo de billetes y monedas
- **Hamburguesas vendidas:** Cantidad del turno
- **Diferencia de caja:** Calculada automáticamente (esperado vs contado)

### Reglas
- El cajero no puede irse sin cerrar el turno
- Si hay diferencia de caja, debe explicar el motivo
- Los datos vienen de **Núcleo Check** y se cargan manualmente
- El encargado puede ver todos los cierres y detectar patrones

### Diferencias
- Diferencia positiva: Sobró plata (raro, posible error de vuelto)
- Diferencia negativa: Faltó plata (posible robo o error)
- Diferencias reiteradas del mismo cajero = alerta al encargado

---

## 🔍 SUPERVISIONES / INSPECCIONES

### Flujo
1. Coordinador visita un local
2. Completa un **checklist predefinido** (template)
3. Cada item tiene puntaje (1-5 o cumple/no cumple)
4. Se generan **action items** (tareas a corregir)
5. El local tiene plazo para corregir
6. En la próxima visita se verifica

### Templates
- Son predefinidos por la marca
- Categorías: Limpieza, Producto, Atención, Seguridad, etc.

### Action items
- Tienen: descripción, responsable, fecha límite
- Estados: **pendiente, en_progreso, completado, vencido**
- Los vencidos generan alerta

---

## 📊 CANON Y LIQUIDACIONES (Marca)

### Canon
- Cada franquiciado paga un **canon mensual** a la marca
- Se calcula como **% de las ventas** del mes
- Se genera la liquidación y el franquiciado paga

### Proceso
1. Se cargan las ventas mensuales de cada local
2. Se calcula el canon (ventas × %)
3. Se genera la liquidación
4. El franquiciado paga
5. Se registra el pago

---

## 🍔 CARTA / MENÚ

### Estructura
- **Items de carta:** Productos que se venden (hamburguesas, papas, bebidas)
- **Preparaciones:** Recetas internas (cómo se hace una hamburguesa)
- **Insumos:** Materias primas (pan, carne, lechuga)

### Composición
- Un item de carta puede tener **preparaciones** y/o **insumos directos**
- Las preparaciones tienen **ingredientes** (insumos con cantidad)
- El costo se calcula automáticamente subiendo desde los insumos

### Precios
- Cada item tiene **precio base**
- Historial de cambios de precio
- **Food cost objetivo** (FC): Costo / Precio × 100

### Gestión
- El Community Manager puede **activar/desactivar** productos
- El Community Manager puede **editar nombres y descripciones**
- Solo Superadmin puede **modificar precios**

---

## ✅ VALIDACIONES QUE SIEMPRE APLICAN

- No se puede aprobar algo ya aprobado
- No se puede cancelar algo ya cancelado
- No se puede eliminar, solo desactivar (soft delete)
- Fechas futuras donde corresponda (no agendar reunión en el pasado)
- Montos siempre > 0 en dinero
- Campos requeridos no pueden ser vacíos
- Solo quien tiene permiso puede hacer la acción
- Toda acción crítica debe confirmar antes de ejecutar

---

## 🚫 QUÉ NO HACER AL CORREGIR

1. **NO crear tablas nuevas** sin consultar
2. **NO cambiar nombres de campos** existentes
3. **NO eliminar código** que no entiendas (puede estar en uso)
4. **NO agregar features** que no estén en esta documentación
5. **NO cambiar la lógica de permisos** sin autorización
6. **NO hacer queries sin manejo de errores**
7. **NO hacer operaciones multi-paso sin transacción**

---

## 🔧 CUÁNDO PREGUNTAR

Preguntá antes de implementar si:
- No hay un ejemplo similar en el código
- La regla de negocio no está clara en este documento
- El cambio afecta más de 3 archivos
- El cambio modifica la base de datos
- El cambio afecta permisos o autenticación

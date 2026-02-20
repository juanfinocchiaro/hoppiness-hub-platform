

## Fix: Popup repetido de QZ Tray "Action Required"

### Por que pasa

Cada vez que entras a cualquier pagina de "Mi Local", **tres componentes diferentes** intentan conectarse a QZ Tray al mismo tiempo:

1. `PrinterStatusDot` (en el sidebar, siempre visible)
2. `usePrinting` hook (en el ManagerDashboard)
3. `PrintersConfigPage` (solo si entras a impresoras)

Cada llamada a `detectQZ()` abre un WebSocket nuevo hacia QZ Tray, y como el certificado esta vacio (uso interno), QZ muestra el popup de "Allow". Si no marcaste **"Remember this decision"**, lo pide cada vez.

### Solucion (dos partes)

**Parte 1 - Accion tuya (inmediata):**
Cuando aparezca el popup de QZ Tray:
1. Marca la casilla **"Remember this decision"**
2. Hace clic en **"Allow"**

Esto evita que vuelva a preguntar en esta computadora.

**Parte 2 - Mejora en el codigo:**
Cachear el resultado de deteccion para evitar multiples conexiones simultaneas innecesarias.

### Cambios tecnicos

**`src/lib/qz-print.ts`**
- Agregar cache de deteccion con TTL de 30 segundos: si `detectQZ()` ya se llamo hace menos de 30s y fue exitoso, retornar el resultado cacheado sin abrir otro WebSocket
- Esto evita que 3 componentes abran 3 conexiones en paralelo al montar la pagina

```text
detectQZ() llamada por PrinterStatusDot  ─┐
detectQZ() llamada por usePrinting       ─┤─> UNA sola conexion WebSocket
detectQZ() llamada por PrintersConfig    ─┘   (las demas usan cache)
```

**`src/components/local/PrinterStatusDot.tsx`**
- Sin cambios funcionales, se beneficia automaticamente del cache

**`src/hooks/usePrinting.ts`**
- Sin cambios funcionales, se beneficia automaticamente del cache


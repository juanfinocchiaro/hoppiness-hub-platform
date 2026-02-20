

## Health Check de Impresoras y Deteccion de Red

Implementacion del sistema de verificacion automatica de conectividad de impresoras con deteccion de red, basado en el documento proporcionado.

---

### Que se va a hacer

1. **Verificacion de conectividad por impresora**: Al entrar a la pagina de configuracion, el sistema testea cada impresora enviando un comando ESC/POS minimo (init `0x1B 0x40`) via QZ Tray. Muestra estado verde/rojo/gris por impresora.

2. **Deteccion de red**: Guarda un fingerprint de la IP publica cuando se configura una impresora. Si el usuario entra desde otra red, muestra un banner de advertencia (solo si alguna impresora no responde).

3. **Rediseno de la pagina de impresoras**: Las impresoras ya no se muestran en cards simples. Cada una muestra su estado de conectividad en tiempo real con acciones contextuales (Reintentar, Test de impresion).

4. **Mejora del manejo de errores al imprimir**: Mensajes mas claros y accionables cuando una impresion falla.

---

### Cambios tecnicos

#### Migracion de base de datos

```sql
ALTER TABLE branch_printers
ADD COLUMN IF NOT EXISTS configured_from_network TEXT;
```

#### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/lib/qz-print.ts` | Agregar `testPrinterConnection(ip, port)` y `getNetworkFingerprint()` |
| `src/hooks/useBranchPrinters.ts` | Guardar `configured_from_network` al crear/editar |
| `src/pages/local/PrintersConfigPage.tsx` | Redisenar ReadyScreen: estado por impresora, banner de red, boton reintentar |
| `src/hooks/usePrinting.ts` | Mejorar mensajes de error con toasts accionables |

#### Nuevas funciones en `qz-print.ts`

- `testPrinterConnection(ip, port, timeout)` -- Envia ESC init via QZ Tray, retorna `{ reachable, latencyMs, error }`
- `getNetworkFingerprint()` -- Llama a `api.ipify.org` para obtener IP publica como identificador de red

#### Logica de la pagina de impresoras (ReadyScreen)

1. Al cargar: obtener fingerprint de red actual + cargar impresoras
2. Para cada impresora con IP: ejecutar `testPrinterConnection` en paralelo
3. Mostrar estado por impresora: verificando (gris+spinner), accesible (verde+latencia), no responde (rojo+mensaje)
4. Si la red actual difiere de `configured_from_network` Y alguna impresora no responde: mostrar banner amarillo
5. Boton "Reintentar" en impresoras rojas, "Test de impresion" en verdes

#### Mejora de errores en `usePrinting.ts`

- Error `QZ_NOT_AVAILABLE`: toast con descripcion y link a configuracion
- Error de conexion: toast con nombre de impresora, IP, y sugerencia de verificar red


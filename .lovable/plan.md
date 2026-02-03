
# Plan: Mejorar Página de Impresión del QR de Fichaje

## Problema Detectado

La página de impresión del QR tiene dos problemas críticos:

1. **QR diminuto**: El SVG se está clonando con un `viewBox` incorrecto que no coincide con el tamaño original, causando que el QR aparezca pequeño en una esquina del contenedor.

2. **Diseño pobre**: La página de impresión actual es muy básica (texto negro sobre fondo blanco) mientras que la pantalla de display (`FichajeQRDisplay.tsx`) tiene un diseño profesional con branding de Hoppiness.

## Solución Propuesta

Rediseñar la página de impresión inspirándome en el diseño de `FichajeQRDisplay.tsx`, adaptado para impresión en papel:

```
+------------------------------------------+
|                                          |
|        [Logo Hoppiness]                  |
|                                          |
|     CONTROL DE ASISTENCIA               |
|        ═══ Manantiales ═══              |
|                                          |
|   +--------------------------------+     |
|   |                                |     |
|   |      [QR CODE GRANDE]          |     |
|   |         280x280px              |     |
|   |                                |     |
|   +--------------------------------+     |
|                                          |
|      Escaneá para fichar                |
|      Ingreso / Egreso                   |
|                                          |
|   ────────────────────────────────      |
|   www.hoppinessclub.com/fichaje/mnt     |
+------------------------------------------+
```

## Cambios Técnicos

### Archivo: `src/pages/local/ClockInsPage.tsx`

1. **Corregir dimensiones del SVG**:
   - Remover el viewBox forzado que causa el problema
   - Usar width/height consistentes (280px para impresión óptima)
   - Mantener el aspect ratio original del QR

2. **Nuevo diseño de impresión**:
   - Header con logo de Hoppiness (embebido como base64 para garantizar que cargue)
   - Título "Control de Asistencia" con nombre del local destacado
   - QR centrado y grande (280x280px)
   - Instrucciones claras debajo
   - URL completa al pie
   - Borde decorativo sutil
   - Optimizado para impresión A4 o carta

3. **Mejoras de usabilidad**:
   - CSS `@media print` para ocultar elementos innecesarios
   - Fondo limpio para ahorrar tinta
   - Márgenes adecuados para corte

## Código CSS de Impresión

```css
@page { margin: 1cm; }
body { 
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  font-family: system-ui, -apple-system, sans-serif;
  margin: 0;
  padding: 40px;
  background: #fff;
}
.header { text-align: center; margin-bottom: 32px; }
.logo { height: 48px; margin-bottom: 16px; }
.title { font-size: 28px; font-weight: bold; margin: 0; color: #1a1a1a; }
.branch-name { 
  display: inline-block;
  background: #f3f4f6;
  padding: 8px 24px;
  border-radius: 20px;
  font-size: 18px;
  font-weight: 600;
  margin-top: 12px;
}
.qr-container {
  background: #fff;
  padding: 24px;
  border: 3px solid #e5e7eb;
  border-radius: 16px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
}
.qr-container svg { display: block; }
.instructions {
  text-align: center;
  margin-top: 24px;
}
.instructions h2 { font-size: 20px; margin: 0 0 4px; }
.instructions p { color: #666; margin: 0; }
.footer {
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
  font-size: 12px;
  color: #999;
  text-align: center;
}
```

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/local/ClockInsPage.tsx` | Refactorizar función `printQR()` con nuevo diseño y corregir dimensiones SVG |

## Consideraciones

- **Logo embebido**: Se usará una versión base64 del logo para evitar problemas de carga en la ventana de impresión
- **Compatibilidad**: El diseño funciona tanto en Chrome como Firefox/Safari
- **Economía de tinta**: Diseño mayormente blanco con acentos grises para no gastar tinta innecesariamente

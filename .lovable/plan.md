

# Plan Completo: Corrección del Sistema de Reglamentos + Formato de Impresión A4

## Diagnóstico Final

### Problema 1: El conteo de empleados es incorrecto

| Vista | Muestra | Debería mostrar |
|-------|---------|-----------------|
| Mi Marca | "0/2 firmas" (usa `user_roles_v2`) | "0/4 firmas" (4 empleados reales) |
| Mi Local | Lista vacía (query incorrecta) | 4 empleados del local |

**Causa raíz**: El código consulta `user_roles_v2` que solo tiene 2 franquiciados, cuando debería usar `user_branch_roles` que tiene los 7 usuarios reales (4 empleados + 3 franquiciados).

### Problema 2: Franquiciados ven reglamento pendiente

El componente `MyRegulationsCard.tsx` muestra el reglamento a todos los usuarios, pero los franquiciados no deberían ver esta sección porque son dueños, no empleados.

### Problema 3: El apercibimiento impreso sale sin formato A4

La función `handlePrint()` copia solo el HTML interno sin incluir:
- Estilos CSS (Tailwind no se aplica)
- El logo correctamente (queda referencia a Vite que no funciona en la ventana nueva)
- Estructura A4 con márgenes

La screenshot muestra el logo con fondo negro y todo el contenido desordenado porque los estilos inline y las clases Tailwind no se transfieren.

---

## Soluciones

### Corrección 1: Usar `user_branch_roles` en Mi Marca

**Archivo:** `src/components/admin/RegulationsManager.tsx`

El query actual (líneas 47-51) usa `user_roles_v2`:
```typescript
const { count: totalEmployees } = await supabase
  .from('user_roles_v2')  // ← Tabla incorrecta
  .select('*', { count: 'exact', head: true })
  .eq('is_active', true)
  .not('local_role', 'is', null);
```

Cambiar a:
```typescript
// Contar empleados únicos (excluyendo franquiciados)
const { data: employeeRoles } = await supabase
  .from('user_branch_roles')
  .select('user_id')
  .eq('is_active', true)
  .neq('local_role', 'franquiciado');

// Eliminar duplicados (un empleado puede estar en 2 sucursales)
const uniqueEmployees = new Set(employeeRoles?.map(r => r.user_id) || []);
const totalEmployees = uniqueEmployees.size;
```

### Corrección 2: Usar `user_branch_roles` en Mi Local

**Archivo:** `src/components/local/RegulationSignaturesPanel.tsx`

El query actual (líneas 78-84) usa:
```typescript
const { data: roles } = await supabase
  .from('user_roles_v2')  // ← Tabla incorrecta
  .select('user_id, local_role')
  .contains('branch_ids', [branchId])  // ← No funciona bien
```

Cambiar a:
```typescript
const { data: roles } = await supabase
  .from('user_branch_roles')
  .select('user_id, local_role')
  .eq('branch_id', branchId)
  .eq('is_active', true)
  .neq('local_role', 'franquiciado');
```

### Corrección 3: Ocultar reglamento para franquiciados

**Archivo:** `src/components/cuenta/MyRegulationsCard.tsx`

Agregar verificación de rol al inicio del componente:
```typescript
// Verificar si el usuario solo tiene rol de franquiciado
const { data: userRoles } = useQuery({
  queryKey: ['my-local-roles', user?.id],
  queryFn: async () => {
    if (!user) return [];
    const { data } = await supabase
      .from('user_branch_roles')
      .select('local_role')
      .eq('user_id', user.id)
      .eq('is_active', true);
    return data || [];
  },
  enabled: !!user,
});

// Si el usuario solo es franquiciado, no mostrar la card
const isOnlyFranquiciado = userRoles?.length > 0 && 
  userRoles.every(r => r.local_role === 'franquiciado');

if (isOnlyFranquiciado) return null;
```

### Corrección 4: Formato de impresión A4 correcto

**Archivos afectados:**
- `src/components/local/team/WarningModal.tsx` (función `handlePrint`)
- `src/components/local/RegulationSignaturesPanel.tsx` (función `handlePrint`)

El problema es que `handlePrint()` copia solo el `innerHTML` sin estilos. Para A4 correcto, necesitamos incluir estilos inline completos en el documento de impresión.

**Cambios en `handlePrint()`:**
```typescript
const handlePrint = () => {
  const printContent = printRef.current;
  if (!printContent) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    toast.error('No se pudo abrir la ventana de impresión');
    return;
  }

  // Convertir la imagen a base64 para incluirla directamente
  const logoImg = printContent.querySelector('img');
  const logoSrc = logoImg?.src || '';

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Apercibimiento - ${employeeProfile?.fullName}</title>
        <style>
          @page {
            size: A4;
            margin: 15mm;
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: Arial, sans-serif;
            font-size: 12pt;
            line-height: 1.5;
            color: #000;
            background: #fff;
            padding: 20px;
          }
          
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #f97316;
            padding-bottom: 16px;
            margin-bottom: 24px;
          }
          
          .header img {
            height: 64px;
          }
          
          .header-right {
            text-align: right;
          }
          
          .header-title {
            font-size: 18px;
            font-weight: bold;
            color: #ea580c;
          }
          
          .header-subtitle {
            font-size: 14px;
            color: #666;
          }
          
          .section {
            margin-bottom: 24px;
          }
          
          .section-title {
            font-weight: bold;
            font-size: 11pt;
            text-transform: uppercase;
            color: #555;
            margin-bottom: 8px;
          }
          
          .data-box {
            background: #f5f5f5;
            padding: 16px;
            border-radius: 4px;
          }
          
          .data-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            font-size: 11pt;
          }
          
          .checkbox-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4px;
            font-size: 11pt;
          }
          
          .checkbox-item {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .checkbox {
            width: 14px;
            height: 14px;
            border: 1px solid #888;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
          }
          
          .description-box {
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 12px;
            min-height: 100px;
            white-space: pre-wrap;
          }
          
          .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 32px;
            margin-top: 48px;
          }
          
          .signature-block {
            text-align: center;
          }
          
          .signature-line {
            border-bottom: 1px solid #888;
            height: 48px;
            margin-bottom: 8px;
          }
          
          .signature-label {
            font-size: 11pt;
            font-weight: 600;
          }
          
          .signature-sub {
            font-size: 9pt;
            color: #888;
            margin-top: 4px;
          }
          
          .date-line {
            text-align: center;
            margin-top: 32px;
            font-size: 11pt;
            color: #666;
          }
          
          .footer {
            margin-top: 48px;
            padding-top: 16px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 9pt;
            color: #aaa;
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
    </html>
  `);
  
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 500);
};
```

### Corrección 5: Documentos con estilos inline

Para que los estilos se apliquen correctamente en la impresión, los componentes `WarningDocumentPreview.tsx` y `RegulationSignatureSheet.tsx` deben usar estilos inline en lugar de clases Tailwind.

**Cambios en `WarningDocumentPreview.tsx`:**

Convertir las clases Tailwind a estilos inline:
```typescript
<div className="flex items-center justify-between border-b-2 border-orange-500 pb-4 mb-6">
```
Se convierte a:
```typescript
<div style={{ 
  display: 'flex', 
  justifyContent: 'space-between', 
  alignItems: 'center',
  borderBottom: '2px solid #f97316',
  paddingBottom: '16px',
  marginBottom: '24px'
}}>
```

Lo mismo para todos los elementos del documento para garantizar que impriman correctamente.

---

## Resumen de Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `RegulationsManager.tsx` | Usar `user_branch_roles` para conteo global |
| `RegulationSignaturesPanel.tsx` | Usar `user_branch_roles` para lista por sucursal |
| `MyRegulationsCard.tsx` | Ocultar si el usuario es solo franquiciado |
| `WarningDocumentPreview.tsx` | Convertir a estilos inline para impresión A4 |
| `RegulationSignatureSheet.tsx` | Convertir a estilos inline para impresión A4 |
| `WarningModal.tsx` | Mejorar `handlePrint()` con estilos completos |

---

## Flujo Corregido

### Sistema de Reglamentos

```
Mi Marca publica reglamento (PDF)
         │
         ▼
┌─────────────────────────────────────────────┐
│ Mi Marca > Reglamentos                      │
│ Muestra: "0/4 firmas" (conteo correcto)     │
│ Usa: user_branch_roles (no franquiciados)   │
└─────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│ Mi Local > Firmas de Reglamento             │
│ Lista 4 empleados del local                 │
│ Botones: [Ver PDF] [Hoja firma] [Subir]     │
└─────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│ Hoja de Firma (A4 correcto)                 │
│ - Logo sin fondo negro                      │
│ - Formato profesional                       │
│ - Listo para imprimir                       │
└─────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│ Mi Cuenta (solo empleados)                  │
│ Franquiciados NO ven esta sección           │
│ Empleados ven estado: Pendiente/Firmado     │
└─────────────────────────────────────────────┘
```

### Apercibimientos

```
Encargado crea apercibimiento
         │
         ▼
Vista previa (A4 correcto)
- Logo azul fondo transparente
- Formato profesional con bordes
- Texto legible
         │
         ▼
[Descargar/Imprimir] → PDF en A4
         │
         ▼
Firmar físicamente → Subir foto
```

---

## Sección Tecnica

### Por qué los estilos no funcionan en impresión

1. **Tailwind CSS**: Las clases se procesan en build time y se inyectan en el `<head>` del documento principal
2. **`window.open()`**: Abre una nueva ventana sin acceso al CSS del documento padre
3. **`innerHTML`**: Solo copia el HTML, no los estilos computados
4. **Imágenes**: Las referencias relativas de Vite (`/src/assets/...`) no funcionan en la nueva ventana

### Solución: Estilos Inline

Al usar `style={{ ... }}` directamente en React:
- Los estilos quedan embebidos en el HTML
- Se copian correctamente con `innerHTML`
- Funcionan en la ventana de impresión

### Logo Base64

Para evitar problemas con la imagen, se puede convertir a base64:
```typescript
// En el componente, convertir imagen a data URL
const [logoBase64, setLogoBase64] = useState('');

useEffect(() => {
  fetch(logoHoppiness)
    .then(res => res.blob())
    .then(blob => {
      const reader = new FileReader();
      reader.onload = () => setLogoBase64(reader.result as string);
      reader.readAsDataURL(blob);
    });
}, []);
```

Esto garantiza que el logo se incluya directamente en el HTML sin referencias externas.


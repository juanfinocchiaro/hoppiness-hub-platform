
# Plan: Corregir Sistema de Fichaje y Guardado de PIN

## Diagnóstico Completo

### Estado Actual de la Base de Datos (Verificado)

| Usuario | Sucursal | clock_pin | Estado |
|---------|----------|-----------|--------|
| Juan Finocchiaro | Manantiales | `1273` | OK - Tiene PIN |
| Dalma Ledesma | Manantiales | `NULL` | ERROR - Sin PIN |
| Braian, Wanda, etc. | Manantiales | `NULL` | Pendiente configurar |

### Sucursal Manantiales

| Campo | Valor | Estado |
|-------|-------|--------|
| clock_code | `mnt` | OK |
| is_active | `true` | OK |
| URL fichaje | `/fichaje/mnt` | OK |

### Causa del Error

El error **"Local no encontrado"** puede aparecer en dos escenarios:

1. **La query de sucursal falla** - Improbable, ya que `mnt` existe y está activo
2. **El usuario está en una URL incorrecta** - Posible (ej: `/fichaje/undefined` o `/fichaje/`)

Pero el **problema real** es que **Dalma no tiene PIN configurado**, lo que significa que:
- El guardado del PIN falló silenciosamente, o
- El usuario no completó el proceso de creación

---

## Cambios a Implementar

### 1. Mejorar Mensajes de Error en Fichaje

**Archivo**: `src/pages/FichajeEmpleado.tsx`

Actualmente cuando `validate_clock_pin_v2` no retorna resultados, el mensaje es genérico. Mejorar para distinguir entre:
- PIN incorrecto
- Usuario sin PIN configurado
- Sin acceso a esta sucursal

```typescript
// ANTES (línea 247-249):
if (!data || data.length === 0) {
  throw new Error('PIN inválido o no tenés acceso a este local');
}

// DESPUÉS:
if (!data || data.length === 0) {
  throw new Error('PIN incorrecto. Verificá que hayas configurado tu PIN para esta sucursal.');
}
```

### 2. Agregar Logging para Diagnóstico

**Archivo**: `src/components/cuenta/BranchPinCard.tsx`

Agregar mejor manejo de errores en el guardado:

```typescript
// En savePinMutation.mutationFn, después de la línea 70:
const { error } = await supabase
  .from('user_branch_roles')
  .update({ clock_pin: newPin })
  .eq('id', roleId);

if (error) {
  console.error('Error saving PIN:', error);
  throw error;
}

// Verificar que se guardó correctamente
const { data: verification } = await supabase
  .from('user_branch_roles')
  .select('clock_pin')
  .eq('id', roleId)
  .single();

if (verification?.clock_pin !== newPin) {
  throw new Error('El PIN no se guardó correctamente. Intentá de nuevo.');
}
```

### 3. Verificar URL de Fichaje en Dashboard

**Archivo**: `src/components/local/ManagerDashboard.tsx`

Asegurar que la URL de fichaje se construye correctamente:

```typescript
// Verificar que branch.clock_code existe antes de mostrar
{branch.clock_code && (
  <Card>
    <CardHeader>
      <CardTitle>Fichaje del Local</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground mb-2">
        URL: {window.location.origin}/fichaje/{branch.clock_code}
      </p>
      {/* QR Code */}
    </CardContent>
  </Card>
)}
```

### 4. Agregar Validación Pre-vuelo en Fichaje

**Archivo**: `src/pages/FichajeEmpleado.tsx`

Antes de intentar validar el PIN, verificar que el branchCode es válido:

```typescript
// Después de obtener la sucursal exitosamente (línea 337):
if (!branch) {
  return (
    <Card>
      <CardContent>
        <AlertCircle />
        <h1>Local no encontrado</h1>
        <p>El código "{branchCode || '(vacío)'}" no existe.</p>
        <p className="text-xs mt-2">
          Verificá que estás escaneando el QR correcto.
        </p>
      </CardContent>
    </Card>
  );
}
```

---

## Resumen de Archivos

| Archivo | Cambio | Prioridad |
|---------|--------|-----------|
| `FichajeEmpleado.tsx` | Mejorar mensaje de error de PIN | Alta |
| `BranchPinCard.tsx` | Agregar verificación post-guardado | Alta |
| `ManagerDashboard.tsx` | Validar clock_code antes de mostrar URL | Media |

---

## Verificación Post-Implementación

1. **Dalma debe ir a /cuenta/perfil** y ver la card de PIN para Manantiales
2. **Crear un PIN** (ej: 1234) y verificar que aparece el mensaje de éxito
3. **Consultar la base de datos** para confirmar que `clock_pin` ya no es NULL
4. **Ir a /fichaje/mnt** e ingresar el PIN
5. **Debe pasar al paso de cámara** sin errores

---

## Datos de Prueba

Para probar manualmente, Dalma puede:
- URL de Mi Perfil: `/cuenta/perfil`
- URL de Fichaje Manantiales: `/fichaje/mnt`
- Su user_id: `056919fb-abde-43bc-972c-a0610a52f694`
- Su role_id en Manantiales: `891773da-72f4-4fce-84ec-94a6e9b78c17`

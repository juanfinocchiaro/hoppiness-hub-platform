
# Plan: Búsqueda Explícita en Agregar Colaborador

## Problema Actual

El diálogo actual funciona así:
1. Usuario ingresa email
2. Selecciona rol  
3. Click "Agregar"
4. El backend decide internamente si agregar o enviar invitación
5. Usuario recibe un toast con el resultado

**Problema**: El usuario no sabe de antemano qué va a pasar. Quiere tener control explícito sobre si buscar primero y luego decidir.

## Nuevo Flujo Propuesto

```
┌─────────────────────────────────────────────────────────┐
│  Paso 1: Ingresar email                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │ [📧 ejemplo@email.com                        ]  │   │
│  └─────────────────────────────────────────────────┘   │
│                   [🔍 Buscar en base de datos]         │
└─────────────────────────────────────────────────────────┘
                          │
         ┌────────────────┴────────────────┐
         ▼                                 ▼
┌─────────────────────┐         ┌─────────────────────┐
│ ✅ Usuario existe   │         │ ❌ No encontrado    │
│                     │         │                     │
│ 👤 Juan Pérez       │         │ El email no está    │
│    juan@email.com   │         │ registrado.         │
│                     │         │                     │
│ Rol: [Cajero ▼]     │         │ Rol: [Cajero ▼]     │
│                     │         │                     │
│ [Agregar al equipo] │         │ [Enviar invitación] │
└─────────────────────┘         └─────────────────────┘
```

## Cambios Técnicos

### Archivo: `src/components/hr/InviteStaffDialog.tsx`

**Nuevos estados:**
```typescript
const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'found' | 'not_found'>('idle');
const [foundUser, setFoundUser] = useState<{ id: string; full_name: string; email: string } | null>(null);
```

**Nueva función de búsqueda:**
```typescript
const handleSearch = async () => {
  if (!email.trim() || !isValidEmail(email)) {
    toast.error('Ingresá un email válido');
    return;
  }
  
  setSearchStatus('searching');
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();
  
  if (profile) {
    setFoundUser(profile);
    setSearchStatus('found');
  } else {
    setFoundUser(null);
    setSearchStatus('not_found');
  }
};
```

**Modificación del UI:**

Reemplazar el formulario actual con un flujo de 2 pasos:

1. **Paso 1 (searchStatus === 'idle' o 'searching'):**
   - Input de email
   - Botón "Buscar en base de datos"

2. **Paso 2 (searchStatus === 'found'):**
   - Mostrar card con datos del usuario encontrado (avatar, nombre, email)
   - Selector de rol
   - Botón "Agregar al equipo" (llama al backend con action 'add')

3. **Paso 2 (searchStatus === 'not_found'):**
   - Mensaje "El email no está registrado en el sistema"
   - Selector de rol
   - Botón "Enviar invitación" (llama al backend con action 'invite')

**Reset al cambiar email:**
```typescript
const handleEmailChange = (value: string) => {
  setEmail(value);
  setSearchStatus('idle');
  setFoundUser(null);
};
```

## Diseño Visual

### Estado Inicial (idle)
```
┌────────────────────────────────────────────────────┐
│ 👥 Agregar Colaborador                        [X] │
├────────────────────────────────────────────────────┤
│ Ingresá el email del colaborador para buscarlo   │
│ en la base de datos.                              │
│                                                    │
│ Email del colaborador                              │
│ ┌────────────────────────────────────────────┐    │
│ │ 📧 ejemplo@email.com                       │    │
│ └────────────────────────────────────────────┘    │
│                                                    │
│          [Cancelar]  [🔍 Buscar]                  │
└────────────────────────────────────────────────────┘
```

### Estado Encontrado (found)
```
┌────────────────────────────────────────────────────┐
│ 👥 Agregar Colaborador                        [X] │
├────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐   │
│ │ ✅ Usuario encontrado                       │   │
│ │                                             │   │
│ │  👤 Juan Pérez                              │   │
│ │     juan.perez@gmail.com                    │   │
│ └─────────────────────────────────────────────┘   │
│                                                    │
│ Rol                                                │
│ ┌────────────────────────────────────────────┐    │
│ │ Encargado                             [▼]  │    │
│ └────────────────────────────────────────────┘    │
│ Gestiona equipo, horarios, comunicados...         │
│                                                    │
│     [← Buscar otro]  [✓ Agregar al equipo]        │
└────────────────────────────────────────────────────┘
```

### Estado No Encontrado (not_found)
```
┌────────────────────────────────────────────────────┐
│ 👥 Agregar Colaborador                        [X] │
├────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐   │
│ │ ⚠️ Usuario no encontrado                    │   │
│ │                                             │   │
│ │ El email "juan@email.com" no está          │   │
│ │ registrado. Se enviará una invitación.      │   │
│ └─────────────────────────────────────────────┘   │
│                                                    │
│ Rol                                                │
│ ┌────────────────────────────────────────────┐    │
│ │ Cajero                                [▼]  │    │
│ └────────────────────────────────────────────┘    │
│ Carga ventas, fichaje y visualiza horarios        │
│                                                    │
│     [← Buscar otro]  [📧 Enviar invitación]       │
└────────────────────────────────────────────────────┘
```

## Resumen de Cambios

| Archivo | Cambio |
|---------|--------|
| `InviteStaffDialog.tsx` | Agregar estados de búsqueda, función de búsqueda, UI condicional |

La edge function `send-staff-invitation` no necesita cambios porque ya maneja ambos casos internamente. Solo cambia la experiencia del usuario que ahora ve explícitamente qué va a pasar antes de confirmar.

## Beneficios

1. **Transparencia**: El usuario sabe de antemano si el colaborador existe o no
2. **Control**: Puede decidir si quiere enviar invitación o buscar otro email
3. **Feedback visual**: Ve los datos del usuario antes de agregarlo
4. **Menos errores**: No hay sorpresas sobre qué acción se ejecutó

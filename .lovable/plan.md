

# Plan: Búsqueda Explícita en Agregar Colaborador

## Resumen del Cambio

Modificar el diálogo "Agregar Colaborador" para que primero busque el email en la base de datos y muestre explícitamente si el usuario existe o no, antes de agregar o enviar invitación.

## Archivo a Modificar

`src/components/hr/InviteStaffDialog.tsx`

## Cambios Técnicos

### 1. Nuevos Estados

```typescript
type SearchStatus = 'idle' | 'searching' | 'found' | 'not_found';

const [searchStatus, setSearchStatus] = useState<SearchStatus>('idle');
const [foundUser, setFoundUser] = useState<{ id: string; full_name: string; email: string } | null>(null);
```

### 2. Función de Búsqueda

```typescript
const handleSearch = async () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email.trim() || !emailRegex.test(email)) {
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

### 3. Reset al Cambiar Email

```typescript
const handleEmailChange = (value: string) => {
  setEmail(value);
  if (searchStatus !== 'idle') {
    setSearchStatus('idle');
    setFoundUser(null);
  }
};
```

### 4. UI Condicional

**Estado idle/searching**: Input de email + botón "Buscar"

**Estado found**: Card verde con datos del usuario + selector de rol + "Agregar al equipo"

**Estado not_found**: Card amarilla con mensaje + selector de rol + "Enviar invitación"

### 5. Reset al Cerrar

```typescript
const handleClose = (isOpen: boolean) => {
  if (!isOpen) {
    setEmail('');
    setRole('cajero');
    setSearchStatus('idle');
    setFoundUser(null);
  }
  onOpenChange(isOpen);
};
```

## Flujo Visual

```
┌─────────────────────────────────────────┐
│  Paso 1: Ingresar email                 │
│  [📧 email@ejemplo.com         ]        │
│            [🔍 Buscar]                  │
└─────────────────────────────────────────┘
              │
    ┌─────────┴─────────┐
    ▼                   ▼
┌────────────┐    ┌────────────┐
│ ✅ Usuario │    │ ⚠️ No      │
│ encontrado │    │ encontrado │
├────────────┤    ├────────────┤
│ 👤 Nombre  │    │ El email   │
│ email      │    │ no existe  │
├────────────┤    ├────────────┤
│ Rol: [▼]   │    │ Rol: [▼]   │
├────────────┤    ├────────────┤
│ [Agregar]  │    │ [Invitar]  │
└────────────┘    └────────────┘
```


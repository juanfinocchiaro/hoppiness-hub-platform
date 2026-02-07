
# Plan: Agregar Corrector Ortográfico a Coaching y Reuniones

## Resumen

Habilitar la corrección ortográfica nativa del navegador en todos los campos de texto de los formularios de coaching y reuniones. Los navegadores modernos (Chrome, Firefox, Safari, Edge) ya incluyen corrector ortográfico integrado, solo necesitamos activarlo con el atributo HTML `spellCheck="true"`.

---

## ¿Cómo Funciona?

El navegador automáticamente:
- Subraya en rojo las palabras mal escritas
- Ofrece sugerencias al hacer clic derecho
- Funciona en español si el navegador está configurado en español

---

## Cambios Técnicos

### 1. Modificar el componente Textarea

Agregar `spellCheck="true"` como prop por defecto:

```tsx
// src/components/ui/textarea.tsx
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        spellCheck={true}           // ← Habilita corrector ortográfico
        lang="es"                   // ← Configura idioma español
        className={cn(...)}
        ref={ref}
        {...props}
      />
    );
  }
);
```

### 2. Modificar el componente Input

Para inputs de texto largo (como acuerdos):

```tsx
// src/components/ui/input.tsx
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        spellCheck={type === 'text' ? true : undefined}  // ← Solo para texto
        lang="es"
        className={cn(...)}
        ref={ref}
        {...props}
      />
    );
  }
);
```

---

## Campos que se Beneficiarán

### Coaching (Empleados y Encargados)
| Campo | Componente |
|-------|-----------|
| Fortalezas | `CoachingForm.tsx`, `CoachingManagerForm.tsx` |
| Áreas de Mejora | `CoachingForm.tsx`, `CoachingManagerForm.tsx` |
| Plan de Acción | `CoachingForm.tsx`, `CoachingManagerForm.tsx` |
| Notas Privadas | `CoachingForm.tsx`, `CoachingManagerForm.tsx` |
| Seguimiento del Plan Anterior | `CoachingForm.tsx`, `CoachingManagerForm.tsx` |

### Reuniones
| Campo | Componente |
|-------|-----------|
| Título de la Reunión | `MeetingConveneModal.tsx` |
| Notas de la Reunión | `MeetingExecutionForm.tsx` |
| Descripción de Acuerdos | `MeetingWizardStep3.tsx`, `MeetingExecutionForm.tsx` |

---

## Beneficios

- **Sin dependencias externas**: Usa el corrector nativo del navegador
- **Funciona offline**: El diccionario está en el navegador
- **Multi-idioma**: Respeta la configuración de idioma del usuario
- **Cero impacto en rendimiento**: Es funcionalidad nativa HTML
- **Compatible con todos los navegadores modernos**

---

## Consideraciones

1. **Idioma español**: Agregamos `lang="es"` para asegurar que use el diccionario español
2. **Solo en texto**: No aplicamos a inputs de tipo email, número, fecha, etc.
3. **Override posible**: Si algún campo específico no necesita corrector, puede pasar `spellCheck={false}`

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/ui/textarea.tsx` | Agregar `spellCheck={true}` y `lang="es"` |
| `src/components/ui/input.tsx` | Agregar `spellCheck={true}` para type="text" y `lang="es"` |

---

## Resultado Visual

Después de implementar, el usuario verá:
- Palabras mal escritas subrayadas en rojo ondulado
- Al hacer clic derecho sobre la palabra, aparecen sugerencias de corrección
- Al seleccionar una sugerencia, se corrige automáticamente

---

## Resumen de Entregables

| Ítem | Descripción |
|------|-------------|
| Corrector habilitado | En todos los Textarea e Input de texto |
| Idioma español | Configurado por defecto |
| Sin librerías | Usa funcionalidad nativa del navegador |
| Transparente | El usuario no tiene que hacer nada extra |



# Plan: Edición inline de cantidad en items del POS

## Problema
Actualmente la cantidad solo se puede cambiar con botones +/- (1 a la vez). Para cantidades grandes (ej: 200 hamburguesas), es impráctico.

## Solución
Hacer que el número de cantidad sea clickeable y se convierta en un input editable. El usuario puede:
- Seguir usando +/- como siempre
- Clickear el número para escribir la cantidad directamente

## Cambios necesarios (3 archivos, solo frontend)

### 1. `src/components/pos/OrderPanel.tsx`
- Reemplazar el `<span>` de cantidad (línea 139) por un componente editable: al hacer click se convierte en un `<Input>` pequeño (w-12, text-center), al perder foco o presionar Enter confirma el valor.
- Agregar prop `onSetQty: (index: number, qty: number) => void` para setear cantidad absoluta.

### 2. `src/components/pos/AccountItemRow.tsx`
- Mismo cambio: el `<span>` de cantidad (línea 68) se convierte en editable al click.
- Agregar prop `onSetQty`.

### 3. `src/pages/pos/POSPage.tsx`
- Agregar función `setQty(index, qty)` que setea la cantidad directamente (min 1).
- Pasarla como prop `onSetQty` a `OrderPanel` y `AccountPanel`.

### Comportamiento del input inline
- Click en el número → aparece input con el valor actual seleccionado
- Enter o blur → confirma (min 1, si vacío vuelve al valor anterior)
- Escape → cancela la edición
- Input type="number", min=1, sin spinners (CSS), ancho ~48px


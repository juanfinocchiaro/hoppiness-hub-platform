

# Fix: Separar texto del hero de la hamburguesa

## Problema
La foto de la hamburguesa se superpone con el texto "CULTO AL SABOR", dificultando la lectura.

## Solucion
Ajustar el CSS del hero en `src/pages/Index.tsx` para empujar la imagen mas a la derecha y oscurecer mas el lado izquierdo:

1. **Mover la foto mas a la derecha**: Cambiar `backgroundPosition` de `'70% center'` a `'85% center'` (o incluso `'right center'`). Esto desplaza la hamburguesa hacia el borde derecho, liberando el lado izquierdo para el texto.

2. **Reforzar el gradiente izquierdo**: Cambiar el gradiente de `from-black/90 via-black/65 to-black/20` a `from-black/95 via-black/70 to-transparent`. Esto crea una zona oscura mas amplia y definida del lado del texto.

3. **Limitar el ancho del texto**: Reducir `max-w-2xl` a `max-w-xl` en el contenedor del texto para que ocupe menos espacio horizontal y no se acerque a la zona de la hamburguesa.

## Resultado esperado
- Lado izquierdo: fondo oscuro con texto legible (logo, titulo, subtitulo, CTAs)
- Lado derecho: hamburguesa protagonista sin obstrucciones
- Efecto tipo "split" natural sin necesidad de recortar la foto

## Archivo a modificar
- `src/pages/Index.tsx` (lineas 32-40, solo cambios de clases CSS)

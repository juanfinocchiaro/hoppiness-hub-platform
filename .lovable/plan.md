

## Boton de descarga del instalador en Estado 2

### El problema

Cuando QZ Tray ya esta instalado, la pagina muestra directamente el Estado 2 (configuracion de impresoras). No hay forma de descargar el `.bat` actualizado. El usuario que instalo la version vieja no tiene como obtener la nueva que inyecta el certificado.

### La solucion

Agregar un boton "Descargar instalador" en el Estado 2, dentro de la seccion de ayuda (Collapsible) que ya existe al final de la pagina. No es algo que se necesite todo el tiempo, asi que va bien escondido en la ayuda.

### Donde se agrega

En el Collapsible de "Ayuda" del ReadyScreen, agregar un item mas:

- **Titulo**: "Actualizar sistema de impresion"
- **Texto**: "Si las impresoras piden permiso cada vez que abrís la página, descargá y ejecutá el instalador actualizado. Se puede ejecutar aunque ya esté instalado."
- **Boton**: "Descargar instalador" (mismo comportamiento que en Estado 1)

### Cambio tecnico

**Archivo: `src/pages/local/PrintersConfigPage.tsx`**

Dentro del `CollapsibleContent` de la seccion "Ayuda" del `ReadyScreen` (alrededor de linea 480), agregar un nuevo bloque despues de los items de ayuda existentes con:

1. Un separador visual
2. Titulo "Actualizar sistema de impresion"
3. Texto explicativo
4. Boton de descarga que baja `/instalar-impresoras.bat`

Se reutiliza la misma logica de descarga que ya existe en el `SetupScreen`.

### Resultado

- El usuario que ya tiene QZ Tray instalado puede ir a Ayuda, descargar el .bat nuevo y ejecutarlo
- No molesta en el flujo normal (esta dentro del acordeon de ayuda)
- Sirve para cualquier actualizacion futura del .bat


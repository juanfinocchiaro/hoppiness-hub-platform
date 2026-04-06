

## Agregar glosario/leyenda al PDF de Liquidación

### Qué se hace
Después de la tabla principal de datos, agregar una sección "Referencias" con la descripción de cada columna para que cualquier persona (estudio contable, franquiciado, etc.) entienda el informe sin necesidad de explicación.

### Contenido de la leyenda

| Columna | Descripción |
|---------|-------------|
| Hs Trab. | Total de horas trabajadas en el mes (incluye feriados, francos, todo lo trabajado en el local) |
| Hs Reg. | Horas regulares de trabajo en el local |
| Vacac. | Dias de vacaciones tomados |
| Faltas Inj. | Faltas injustificadas. No afecta liquidacion pero el empleado pierde el presentismo |
| Falta Just. | Falta justificada: se computan las horas del horario programado ese dia |
| Tardanza | Minutos de tardanza acumulados en el mes. 15 min acumulados = pierde presentismo |
| Hs Fer. | Horas trabajadas en dias feriado |
| Hs Franco | Horas trabajadas en dia franco |
| Ext. Hab. | Horas extras de lunes a viernes |
| Ext. Inh. | Horas extras de sabado y domingo |
| Present. | Presentismo: SI si no tiene faltas injustificadas ni tardanza mayor a 15 min |

### Implementacion

Se agrega una tabla compacta tipo `autoTable` debajo de la tabla principal (o en la ultima pagina si no entra), con dos columnas: "Columna" y "Descripcion", usando fuente pequena (7-8pt) y estilo sutil para que no compita visualmente con los datos.

### Archivo a modificar
- `src/utils/laborExport.ts` — funcion `exportLaborPDF`, agregar seccion de referencias despues de la tabla principal


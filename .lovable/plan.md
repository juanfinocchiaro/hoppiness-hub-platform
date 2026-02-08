
## ✅ COMPLETADO: Mejorar Visualización de Cobertura de Madrugada (Turnos Nocturnos)

### Cambios Implementados

1. **Ordenamiento de horas en secuencia operativa (11:00 → 04:00)**
   - Las horas de madrugada (0-4) ahora aparecen al final de la grilla, después de las 23:00
   - Helper `operationalHourOrder` convierte horas en orden lógico de jornada

2. **Nueva lógica de `getEmployeesAtHour`**
   - Para horas de madrugada (0-4): muestra empleados cuyo turno EMPEZÓ ese mismo día y cruza medianoche
   - Para horas normales (5-23): lógica estándar de cobertura

3. **Indicadores visuales**
   - Etiqueta "(cierre)" en las filas de 00:00-04:00
   - Tooltips mejorados que indican "Cerrando el turno:" en lugar de "X personas:"

### Resultado

Un turno 20:00-02:00 del sábado 7 ahora muestra cobertura correctamente:
- **Sábado 7**: filas 20:00, 21:00, 22:00, 23:00, 00:00 (cierre), 01:00 (cierre)
- **Domingo 8**: SIN cobertura en madrugada (salvo que haya turnos programados para ese día)

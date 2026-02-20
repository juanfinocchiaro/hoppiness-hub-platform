

## Fix del instalador .bat - Usar script PowerShell temporal

### Problema

CMD sigue interpretando caracteres especiales dentro del comando PowerShell embebido (comillas, parentesis, barras, signos). No importa como se escape, CMD procesa la linea antes de pasarsela a PowerShell.

### Solucion

En vez de meter el certificado en una linea de CMD, el .bat va a:

1. Crear un archivo temporal `%TEMP%\hoppiness-setup.ps1` con el script PowerShell
2. Ejecutar ese `.ps1` con PowerShell
3. Borrar el `.ps1` temporal

Asi CMD nunca ve el contenido del certificado, solo crea el archivo y lo ejecuta.

### Cambio tecnico

**Archivo: `public/instalar-impresoras.bat`**

Reemplazar los pasos 2 (certificado) y la config de properties por:

```text
:: Paso 2/3: Crear script temporal de PowerShell
set "PS_SCRIPT=%TEMP%\hoppiness-setup.ps1"

> "%PS_SCRIPT%" echo $cert = @"
>> "%PS_SCRIPT%" echo -----BEGIN CERTIFICATE-----
>> "%PS_SCRIPT%" echo MIIDIjCCAgqgAwIBAgIBATANBgkqhkiG9w0BAQsFADBFMR0wGwYDVQQDExRIb3Bw
...cada linea del certificado como echo separado...
>> "%PS_SCRIPT%" echo -----END CERTIFICATE-----
>> "%PS_SCRIPT%" echo "@
>> "%PS_SCRIPT%" echo Set-Content -Path 'C:\Program Files\QZ Tray\hoppiness-hub.crt' -Value $cert -Encoding ASCII
>> "%PS_SCRIPT%" echo $props = 'C:\Program Files\QZ Tray\qz-tray.properties'
>> "%PS_SCRIPT%" echo if (Test-Path $props) {
>> "%PS_SCRIPT%" echo   $c = Get-Content $props ^| Where-Object { $_ -notmatch 'authcert.override' }
>> "%PS_SCRIPT%" echo   Set-Content $props -Value $c
>> "%PS_SCRIPT%" echo }
>> "%PS_SCRIPT%" echo Add-Content $props 'authcert.override=hoppiness-hub.crt'

:: Ejecutar y limpiar
powershell -ExecutionPolicy Bypass -File "%PS_SCRIPT%"
del "%PS_SCRIPT%"
```

Cada linea del certificado va como un `echo` individual redirigido al archivo `.ps1`. CMD no intenta interpretar el contenido porque solo esta haciendo `echo texto >> archivo`. Luego PowerShell ejecuta el `.ps1` sin problemas.

### Estructura final del .bat

```text
Paso 1: Instalar QZ Tray (irm pwsh.sh | iex) -- sin cambios
Paso 2: Crear .ps1 temporal, ejecutar, borrar -- NUEVO
Paso 3: Reiniciar QZ Tray (taskkill + start) -- sin cambios
```

### Resultado

- No hay caracteres especiales que CMD pueda malinterpretar
- El certificado se escribe limpio via PowerShell
- El properties se actualiza correctamente
- El .ps1 temporal se borra al finalizar


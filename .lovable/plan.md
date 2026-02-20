

## Fix definitivo del .bat - Eliminar here-strings de PowerShell

### Problema

Los delimitadores de here-string de PowerShell (`@"` y `"@`) contienen comillas dobles que CMD interpreta como delimitadores de cadena propios, rompiendo el parseo de todas las lineas siguientes. Por eso se ven errores como `"RIPT" echo ...` -- CMD corta las lineas en las comillas.

### Solucion

Reemplazar el here-string (`@" ... "@`) por un array de PowerShell con comillas simples. CMD no interpreta comillas simples (`'`), asi que las lineas del certificado pasan limpias al archivo .ps1.

### Cambio tecnico

**Archivo: `public/instalar-impresoras.bat`**

Reemplazar las lineas 28-55 (la seccion que crea el .ps1) con:

```text
> "%PS_SCRIPT%" echo $lines = @(
>> "%PS_SCRIPT%" echo '-----BEGIN CERTIFICATE-----',
>> "%PS_SCRIPT%" echo 'MIIDIjCCAgqgAwIBAgIBATANBgkqhkiG9w0BAQsFADBFMR0wGwYDVQQDExRIb3Bw',
>> "%PS_SCRIPT%" echo 'aW5lc3NIdWIgUVogVHJheTEXMBUGA1UEChMOSG9wcGluZXNzIENsdWIxCzAJBgNV',
...cada linea del certificado con comillas simples y coma...
>> "%PS_SCRIPT%" echo '-----END CERTIFICATE-----'
>> "%PS_SCRIPT%" echo )
>> "%PS_SCRIPT%" echo $cert = $lines -join [char]10
>> "%PS_SCRIPT%" echo Set-Content -Path 'C:\Program Files\QZ Tray\hoppiness-hub.crt' -Value $cert -Encoding ASCII
>> "%PS_SCRIPT%" echo $props = 'C:\Program Files\QZ Tray\qz-tray.properties'
>> "%PS_SCRIPT%" echo if (Test-Path $props) {
>> "%PS_SCRIPT%" echo   $c = Get-Content $props ^| Where-Object { $_ -notmatch 'authcert.override' }
>> "%PS_SCRIPT%" echo   Set-Content $props -Value $c
>> "%PS_SCRIPT%" echo }
>> "%PS_SCRIPT%" echo Add-Content $props 'authcert.override=hoppiness-hub.crt'
```

### Por que funciona

- Las comillas simples (`'`) no son especiales en CMD, asi que pasan tal cual al archivo
- Se elimina `@"` y `"@` que eran la causa raiz de los errores
- `@(` y `)` no son especiales dentro de un `echo` de CMD
- El `^|` ya estaba bien escapado para CMD
- PowerShell reconstruye el certificado completo con `-join [char]10` (salto de linea)

### Sin cambios

- Paso 1 (instalar QZ Tray): sin cambios
- Paso 3 (reiniciar servicio): sin cambios
- Estructura general del .bat: sin cambios


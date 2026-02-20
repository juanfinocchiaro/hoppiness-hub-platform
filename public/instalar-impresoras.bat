@echo off
chcp 65001 >nul

:: ══════════════════════════════════════════════
::   Auto-elevacion a administrador
:: ══════════════════════════════════════════════
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo.
echo ══════════════════════════════════════════════
echo   Hoppiness Hub - Instalador de Impresoras
echo ══════════════════════════════════════════════
echo.
echo   Paso 1/3: Instalando QZ Tray...
echo.
powershell -ExecutionPolicy Bypass -Command "irm pwsh.sh | iex"

echo.
echo   Paso 2/3: Configurando certificado...
echo.

set "QZ_DIR=C:\Program Files\QZ Tray"
set "CRT_FILE=%QZ_DIR%\hoppiness-hub.crt"
set "PROPS_FILE=%QZ_DIR%\qz-tray.properties"

:: Escribir el certificado PEM usando PowerShell (evita problemas de caracteres especiales en batch)
powershell -ExecutionPolicy Bypass -Command "Set-Content -Path '%CRT_FILE%' -Encoding ASCII -Value ('-----BEGIN CERTIFICATE-----','MIIDIjCCAgqgAwIBAgIBATANBgkqhkiG9w0BAQsFADBFMR0wGwYDVQQDExRIb3Bw','aW5lc3NIdWIgUVogVHJheTEXMBUGA1UEChMOSG9wcGluZXNzIENsdWIxCzAJBgNV','BAYTAkFSMB4XDTI2MDIyMDE3MjEwNloXDTM2MDIyMDE3MjEwNlowRTEdMBsGA1UE','AxMUSG9wcGluZXNzSHViIFFaIFRyYXkxFzAVBgNVBAoTDkhvcHBpbmVzcyBDbHVi','MQswCQYDVQQGEwJBUjCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAIWm','UrlkwvDKBw3o7fZs2OwwcxvstWoXmEshHDa/VvLjfcH4JqxEDPL/I6Eaq9Y6vhRa','hmnfWUJVbPjlXyIkPJYhPqScBURmf9axSGSTMjB27rnLRFjPB49tFGiG29HogvKW','K3goW04Ge6RM68As1vNYUsc4aiX0vZ3f6yCj2JThjZAou2qJMNh/b4CddljEgWHT','laPUFcEHL6eXdKsqjHid8RQ7z8Drk5Oxu00kfLCDstmxPnU8DM4mYEbwmHnKlfIE','/2G7EeCTYN5JdV4xz8BQtXZOgO5D/ZFfXnX+4ESLC1njUosl0kf4AHVpHiX+Go0W','V/6Wa9V2msViqY2i+UkCAwEAAaMdMBswDAYDVR0TBAUwAwEB/zALBgNVHQ8EBAMC','AvQwDQYJKoZIhvcNAQELBQADggEBADDLJaAeIw2f/DkkkJX8Eaaa7zcvkI5JjbOP','hU1wVwjW6OKrJk6zI5+hZR5YnSzxfTmub81YV3sPcHOrMIaPCxu2CZZK2yj+8QIP','WZ+ZpapFxY9g+KTyZa49/Srcn8PYKKGZCjl0NlDEq5xK8E5e9eXqm2FEPRQeu/AO','6W0XAZsFOP1yswD6s6ln1X2UkWYMYLSgu4uRWbNd96UwB1S4o9QDUbZxavOEXEgy','JhVLARgA7n9Jg6Fa/lEvcb+kGZH8NUXR82Y6OnK72CHywzzMwCGParzge42hItoI','UZ51nhbiseVD4j99EhiMk5TG00mmQMzg/IJa4GLi17MosHQ7PvY=','-----END CERTIFICATE-----' -join [char]10)"

:: Configurar authcert.override en properties
if exist "%PROPS_FILE%" (
    powershell -ExecutionPolicy Bypass -Command "$c = Get-Content '%PROPS_FILE%' | Where-Object { $_ -notmatch 'authcert.override' }; Set-Content '%PROPS_FILE%' -Value $c"
)
>>"%PROPS_FILE%" echo authcert.override=hoppiness-hub.crt

echo.
echo   Paso 3/3: Reiniciando servicio...
echo.

taskkill /IM qz-tray.exe /F >nul 2>&1
timeout /t 2 /nobreak >nul
start "" "%QZ_DIR%\qz-tray.exe"

echo.
echo ══════════════════════════════════════════════
echo   Listo! Ya podes imprimir desde Hoppiness Hub.
echo   No hace falta hacer nada mas.
echo ══════════════════════════════════════════════
echo.
pause

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

:: Escribir el certificado PEM
(
echo -----BEGIN CERTIFICATE-----
echo MIIDIjCCAgqgAwIBAgIBATANBgkqhkiG9w0BAQsFADBFMR0wGwYDVQQDExRIb3Bw
echo aW5lc3NIdWIgUVogVHJheTEXMBUGA1UEChMOSG9wcGluZXNzIENsdWIxCzAJBgNV
echo BAYTAkFSMB4XDTI2MDIyMDE3MjEwNloXDTM2MDIyMDE3MjEwNlowRTEdMBsGA1UE
echo AxMUSG9wcGluZXNzSHViIFFaIFRyYXkxFzAVBgNVBAoTDkhvcHBpbmVzcyBDbHVi
echo MQswCQYDVQQGEwJBUjCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAIWm
echo UrlkwvDKBw3o7fZs2OwwcxvstWoXmEshHDa/VvLjfcH4JqxEDPL/I6Eaq9Y6vhRa
echo hmnfWUJVbPjlXyIkPJYhPqScBURmf9axSGSTMjB27rnLRFjPB49tFGiG29HogvKW
echo K3goW04Ge6RM68As1vNYUsc4aiX0vZ3f6yCj2JThjZAou2qJMNh/b4CddljEgWHT
echo laPUFcEHL6eXdKsqjHid8RQ7z8Drk5Oxu00kfLCDstmxPnU8DM4mYEbwmHnKlfIE
echo /2G7EeCTYN5JdV4xz8BQtXZOgO5D/ZFfXnX+4ESLC1njUosl0kf4AHVpHiX+Go0W
echo V/6Wa9V2msViqY2i+UkCAwEAAaMdMBswDAYDVR0TBAUwAwEB/zALBgNVHQ8EBAMC
echo AvQwDQYJKoZIhvcNAQELBQADggEBADDLJaAeIw2f/DkkkJX8Eaaa7zcvkI5JjbOP
echo hU1wVwjW6OKrJk6zI5+hZR5YnSzxfTmub81YV3sPcHOrMIaPCxu2CZZK2yj+8QIP
echo WZ+ZpapFxY9g+KTyZa49/Srcn8PYKKGZCjl0NlDEq5xK8E5e9eXqm2FEPRQeu/AO
echo 6W0XAZsFOP1yswD6s6ln1X2UkWYMYLSgu4uRWbNd96UwB1S4o9QDUbZxavOEXEgy
echo JhVLARgA7n9Jg6Fa/lEvcb+kGZH8NUXR82Y6OnK72CHywzzMwCGParzge42hItoI
echo UZ51nhbiseVD4j99EhiMk5TG00mmQMzg/IJa4GLi17MosHQ7PvY=
echo -----END CERTIFICATE-----
) > "%CRT_FILE%"

:: Configurar authcert.override en properties
:: Primero eliminar linea existente si la hay, luego agregar
if exist "%PROPS_FILE%" (
    findstr /v /c:"authcert.override" "%PROPS_FILE%" > "%PROPS_FILE%.tmp"
    move /y "%PROPS_FILE%.tmp" "%PROPS_FILE%" >nul
)
echo authcert.override=hoppiness-hub.crt>> "%PROPS_FILE%"

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

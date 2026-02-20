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

set "PS_SCRIPT=%TEMP%\hoppiness-setup.ps1"

> "%PS_SCRIPT%" echo $cert = @"
>> "%PS_SCRIPT%" echo -----BEGIN CERTIFICATE-----
>> "%PS_SCRIPT%" echo MIIDIjCCAgqgAwIBAgIBATANBgkqhkiG9w0BAQsFADBFMR0wGwYDVQQDExRIb3Bw
>> "%PS_SCRIPT%" echo aW5lc3NIdWIgUVogVHJheTEXMBUGA1UEChMOSG9wcGluZXNzIENsdWIxCzAJBgNV
>> "%PS_SCRIPT%" echo BAYTAkFSMB4XDTI2MDIyMDE3MjEwNloXDTM2MDIyMDE3MjEwNlowRTEdMBsGA1UE
>> "%PS_SCRIPT%" echo AxMUSG9wcGluZXNzSHViIFFaIFRyYXkxFzAVBgNVBAoTDkhvcHBpbmVzcyBDbHVi
>> "%PS_SCRIPT%" echo MQswCQYDVQQGEwJBUjCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAIWm
>> "%PS_SCRIPT%" echo UrlkwvDKBw3o7fZs2OwwcxvstWoXmEshHDa/VvLjfcH4JqxEDPL/I6Eaq9Y6vhRa
>> "%PS_SCRIPT%" echo hmnfWUJVbPjlXyIkPJYhPqScBURmf9axSGSTMjB27rnLRFjPB49tFGiG29HogvKW
>> "%PS_SCRIPT%" echo K3goW04Ge6RM68As1vNYUsc4aiX0vZ3f6yCj2JThjZAou2qJMNh/b4CddljEgWHT
>> "%PS_SCRIPT%" echo laPUFcEHL6eXdKsqjHid8RQ7z8Drk5Oxu00kfLCDstmxPnU8DM4mYEbwmHnKlfIE
>> "%PS_SCRIPT%" echo /2G7EeCTYN5JdV4xz8BQtXZOgO5D/ZFfXnX+4ESLC1njUosl0kf4AHVpHiX+Go0W
>> "%PS_SCRIPT%" echo V/6Wa9V2msViqY2i+UkCAwEAAaMdMBswDAYDVR0TBAUwAwEB/zALBgNVHQ8EBAMC
>> "%PS_SCRIPT%" echo AvQwDQYJKoZIhvcNAQELBQADggEBADDLJaAeIw2f/DkkkJX8Eaaa7zcvkI5JjbOP
>> "%PS_SCRIPT%" echo hU1wVwjW6OKrJk6zI5+hZR5YnSzxfTmub81YV3sPcHOrMIaPCxu2CZZK2yj+8QIP
>> "%PS_SCRIPT%" echo WZ+ZpapFxY9g+KTyZa49/Srcn8PYKKGZCjl0NlDEq5xK8E5e9eXqm2FEPRQeu/AO
>> "%PS_SCRIPT%" echo 6W0XAZsFOP1yswD6s6ln1X2UkWYMYLSgu4uRWbNd96UwB1S4o9QDUbZxavOEXEgy
>> "%PS_SCRIPT%" echo JhVLARgA7n9Jg6Fa/lEvcb+kGZH8NUXR82Y6OnK72CHywzzMwCGParzge42hItoI
>> "%PS_SCRIPT%" echo UZ51nhbiseVD4j99EhiMk5TG00mmQMzg/IJa4GLi17MosHQ7PvY=
>> "%PS_SCRIPT%" echo -----END CERTIFICATE-----
>> "%PS_SCRIPT%" echo "@
>> "%PS_SCRIPT%" echo Set-Content -Path 'C:\Program Files\QZ Tray\hoppiness-hub.crt' -Value $cert -Encoding ASCII
>> "%PS_SCRIPT%" echo $props = 'C:\Program Files\QZ Tray\qz-tray.properties'
>> "%PS_SCRIPT%" echo if (Test-Path $props) {
>> "%PS_SCRIPT%" echo   $c = Get-Content $props ^| Where-Object { $_ -notmatch 'authcert.override' }
>> "%PS_SCRIPT%" echo   Set-Content $props -Value $c
>> "%PS_SCRIPT%" echo }
>> "%PS_SCRIPT%" echo Add-Content $props 'authcert.override=hoppiness-hub.crt'

powershell -ExecutionPolicy Bypass -File "%PS_SCRIPT%"
del "%PS_SCRIPT%"

echo.
echo   Paso 3/3: Reiniciando servicio...
echo.

taskkill /IM qz-tray.exe /F >nul 2>&1
timeout /t 2 /nobreak >nul
start "" "C:\Program Files\QZ Tray\qz-tray.exe"

echo.
echo ══════════════════════════════════════════════
echo   Listo! Ya podes imprimir desde Hoppiness Hub.
echo   No hace falta hacer nada mas.
echo ══════════════════════════════════════════════
echo.
pause

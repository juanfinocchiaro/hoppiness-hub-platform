@echo off
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo.
echo   ==========================================
echo   Hoppiness Hub - Instalador de Impresoras
echo   ==========================================
echo.
echo   Paso 1/3: Instalando QZ Tray...
echo.
powershell -ExecutionPolicy Bypass -Command "irm pwsh.sh | iex"

echo.
echo   Paso 2/3: Configurando certificado...
echo.

set "CERTFILE=%TEMP%\hoppiness-hub.crt"
> "%CERTFILE%" echo -----BEGIN CERTIFICATE-----
>> "%CERTFILE%" echo MIIDIjCCAgqgAwIBAgIBATANBgkqhkiG9w0BAQsFADBFMR0wGwYDVQQDExRIb3Bw
>> "%CERTFILE%" echo aW5lc3NIdWIgUVogVHJheTEXMBUGA1UEChMOSG9wcGluZXNzIENsdWIxCzAJBgNV
>> "%CERTFILE%" echo BAYTAkFSMB4XDTI2MDIyMDE3MjEwNloXDTM2MDIyMDE3MjEwNlowRTEdMBsGA1UE
>> "%CERTFILE%" echo AxMUSG9wcGluZXNzSHViIFFaIFRyYXkxFzAVBgNVBAoTDkhvcHBpbmVzcyBDbHVi
>> "%CERTFILE%" echo MQswCQYDVQQGEwJBUjCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAIWm
>> "%CERTFILE%" echo UrlkwvDKBw3o7fZs2OwwcxvstWoXmEshHDa/VvLjfcH4JqxEDPL/I6Eaq9Y6vhRa
>> "%CERTFILE%" echo hmnfWUJVbPjlXyIkPJYhPqScBURmf9axSGSTMjB27rnLRFjPB49tFGiG29HogvKW
>> "%CERTFILE%" echo K3goW04Ge6RM68As1vNYUsc4aiX0vZ3f6yCj2JThjZAou2qJMNh/b4CddljEgWHT
>> "%CERTFILE%" echo laPUFcEHL6eXdKsqjHid8RQ7z8Drk5Oxu00kfLCDstmxPnU8DM4mYEbwmHnKlfIE
>> "%CERTFILE%" echo /2G7EeCTYN5JdV4xz8BQtXZOgO5D/ZFfXnX+4ESLC1njUosl0kf4AHVpHiX+Go0W
>> "%CERTFILE%" echo V/6Wa9V2msViqY2i+UkCAwEAAaMdMBswDAYDVR0TBAUwAwEB/zALBgNVHQ8EBAMC
>> "%CERTFILE%" echo AvQwDQYJKoZIhvcNAQELBQADggEBADDLJaAeIw2f/DkkkJX8Eaaa7zcvkI5JjbOP
>> "%CERTFILE%" echo hU1wVwjW6OKrJk6zI5+hZR5YnSzxfTmub81YV3sPcHOrMIaPCxu2CZZK2yj+8QIP
>> "%CERTFILE%" echo WZ+ZpapFxY9g+KTyZa49/Srcn8PYKKGZCjl0NlDEq5xK8E5e9eXqm2FEPRQeu/AO
>> "%CERTFILE%" echo 6W0XAZsFOP1yswD6s6ln1X2UkWYMYLSgu4uRWbNd96UwB1S4o9QDUbZxavOEXEgy
>> "%CERTFILE%" echo JhVLARgA7n9Jg6Fa/lEvcb+kGZH8NUXR82Y6OnK72CHywzzMwCGParzge42hItoI
>> "%CERTFILE%" echo UZ51nhbiseVD4j99EhiMk5TG00mmQMzg/IJa4GLi17MosHQ7PvY=
>> "%CERTFILE%" echo -----END CERTIFICATE-----

powershell -ExecutionPolicy Bypass -Command "Copy-Item -Path $env:TEMP'\hoppiness-hub.crt' -Destination 'C:\Program Files\QZ Tray\hoppiness-hub.crt' -Force; $p='C:\Program Files\QZ Tray\qz-tray.properties'; if(Test-Path $p){$c=Get-Content $p|Where-Object{$_ -notmatch 'authcert.override'};Set-Content $p $c};Add-Content $p 'authcert.override=hoppiness-hub.crt'"
del "%CERTFILE%"

echo.
echo   Paso 3/3: Reiniciando servicio...
echo.
taskkill /IM qz-tray.exe /F >nul 2>&1
timeout /t 2 /nobreak >nul
start "" "C:\Program Files\QZ Tray\qz-tray.exe"

echo.
echo   ==========================================
echo   Listo! Ya podes imprimir desde Hoppiness Hub.
echo   No hace falta hacer nada mas.
echo   ==========================================
echo.
pause

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
echo   Paso 1/2: Instalando QZ Tray...
echo.
powershell -ExecutionPolicy Bypass -Command "irm pwsh.sh | iex"

echo.
echo   Paso 2/2: Configurando permisos...
echo.

:: Escribir script PowerShell limpio sin problemas de escape
set "PSFILE=%TEMP%\hoppiness-setup.ps1"

> "%PSFILE%" echo # Hoppiness Hub - Configuracion QZ Tray
>> "%PSFILE%" echo $qzDir = 'C:\Program Files\QZ Tray'
>> "%PSFILE%" echo $propsFile = Join-Path $qzDir 'qz-tray.properties'
>> "%PSFILE%" echo.
>> "%PSFILE%" echo # Escribir certificado sin espacios trailing
>> "%PSFILE%" echo $certLines = @(
>> "%PSFILE%" echo '-----BEGIN CERTIFICATE-----'
>> "%PSFILE%" echo 'MIIDIjCCAgqgAwIBAgIBATANBgkqhkiG9w0BAQsFADBFMR0wGwYDVQQDExRIb3Bw'
>> "%PSFILE%" echo 'aW5lc3NIdWIgUVogVHJheTEXMBUGA1UEChMOSG9wcGluZXNzIENsdWIxCzAJBgNV'
>> "%PSFILE%" echo 'BAYTAkFSMB4XDTI2MDIyMDE3MjEwNloXDTM2MDIyMDE3MjEwNlowRTEdMBsGA1UE'
>> "%PSFILE%" echo 'AxMUSG9wcGluZXNzSHViIFFaIFRyYXkxFzAVBgNVBAoTDkhvcHBpbmVzcyBDbHVi'
>> "%PSFILE%" echo 'MQswCQYDVQQGEwJBUjCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAIWm'
>> "%PSFILE%" echo 'UrlkwvDKBw3o7fZs2OwwcxvstWoXmEshHDa/VvLjfcH4JqxEDPL/I6Eaq9Y6vhRa'
>> "%PSFILE%" echo 'hmnfWUJVbPjlXyIkPJYhPqScBURmf9axSGSTMjB27rnLRFjPB49tFGiG29HogvKW'
>> "%PSFILE%" echo 'K3goW04Ge6RM68As1vNYUsc4aiX0vZ3f6yCj2JThjZAou2qJMNh/b4CddljEgWHT'
>> "%PSFILE%" echo 'laPUFcEHL6eXdKsqjHid8RQ7z8Drk5Oxu00kfLCDstmxPnU8DM4mYEbwmHnKlfIE'
>> "%PSFILE%" echo '/2G7EeCTYN5JdV4xz8BQtXZOgO5D/ZFfXnX+4ESLC1njUosl0kf4AHVpHiX+Go0W'
>> "%PSFILE%" echo 'V/6Wa9V2msViqY2i+UkCAwEAAaMdMBswDAYDVR0TBAUwAwEB/zALBgNVHQ8EBAMC'
>> "%PSFILE%" echo 'AvQwDQYJKoZIhvcNAQELBQADggEBADDLJaAeIw2f/DkkkJX8Eaaa7zcvkI5JjbOP'
>> "%PSFILE%" echo 'hU1wVwjW6OKrJk6zI5+hZR5YnSzxfTmub81YV3sPcHOrMIaPCxu2CZZK2yj+8QIP'
>> "%PSFILE%" echo 'WZ+ZpapFxY9g+KTyZa49/Srcn8PYKKGZCjl0NlDEq5xK8E5e9eXqm2FEPRQeu/AO'
>> "%PSFILE%" echo '6W0XAZsFOP1yswD6s6ln1X2UkWYMYLSgu4uRWbNd96UwB1S4o9QDUbZxavOEXEgy'
>> "%PSFILE%" echo 'JhVLARgA7n9Jg6Fa/lEvcb+kGZH8NUXR82Y6OnK72CHywzzMwCGParzge42hItoI'
>> "%PSFILE%" echo 'UZ51nhbiseVD4j99EhiMk5TG00mmQMzg/IJa4GLi17MosHQ7PvY='
>> "%PSFILE%" echo '-----END CERTIFICATE-----'
>> "%PSFILE%" echo )
>> "%PSFILE%" echo $certContent = ($certLines ^| ForEach-Object { $_.Trim() }) -join "`n"
>> "%PSFILE%" echo $certPath = Join-Path $qzDir 'hoppiness-hub.crt'
>> "%PSFILE%" echo [System.IO.File]::WriteAllText($certPath, $certContent)
>> "%PSFILE%" echo Write-Host 'Certificado instalado OK'
>> "%PSFILE%" echo.
>> "%PSFILE%" echo # Actualizar properties
>> "%PSFILE%" echo if (Test-Path $propsFile) {
>> "%PSFILE%" echo   $lines = Get-Content $propsFile
>> "%PSFILE%" echo   $clean = $lines ^| Where-Object {
>> "%PSFILE%" echo     $_ -notmatch 'authcert.override' -and
>> "%PSFILE%" echo     $_ -notmatch 'security.data.enabled' -and
>> "%PSFILE%" echo     $_ -notmatch 'security.print.strict'
>> "%PSFILE%" echo   }
>> "%PSFILE%" echo   Set-Content -Path $propsFile -Value $clean
>> "%PSFILE%" echo }
>> "%PSFILE%" echo Add-Content -Path $propsFile -Value 'authcert.override=hoppiness-hub.crt'
>> "%PSFILE%" echo Add-Content -Path $propsFile -Value 'security.data.enabled=false'
>> "%PSFILE%" echo Add-Content -Path $propsFile -Value 'security.print.strict=false'
>> "%PSFILE%" echo Write-Host 'Properties actualizado OK'
>> "%PSFILE%" echo.
>> "%PSFILE%" echo # Pre-autorizar el certificado en allowed.dat del usuario
>> "%PSFILE%" echo $appDataDir = Join-Path $env:APPDATA 'qz'
>> "%PSFILE%" echo if (-not (Test-Path $appDataDir)) { New-Item -ItemType Directory -Path $appDataDir -Force }
>> "%PSFILE%" echo $allowedFile = Join-Path $appDataDir 'allowed.dat'
>> "%PSFILE%" echo if (-not (Test-Path $allowedFile)) { New-Item -ItemType File -Path $allowedFile -Force }
>> "%PSFILE%" echo Write-Host 'Directorio de permisos configurado OK'

powershell -ExecutionPolicy Bypass -File "%PSFILE%"
del "%PSFILE%" 2>nul

echo.
echo   Reiniciando servicio...
echo.
taskkill /IM qz-tray.exe /F >nul 2>&1
timeout /t 3 /nobreak >nul
start "" "C:\Program Files\QZ Tray\qz-tray.exe"

echo.
echo   ==========================================
echo   Listo! Ya podes imprimir desde Hoppiness Hub.
echo   ==========================================
echo.
pause

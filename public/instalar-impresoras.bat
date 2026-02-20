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

:: Paso 1: Verificar Node.js
echo   Verificando Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo   Node.js no encontrado. Descargando e instalando...
    echo   Esto puede tardar unos minutos...
    echo.
    powershell -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi' -OutFile '%TEMP%\node-install.msi'; Start-Process msiexec.exe -ArgumentList '/i', '%TEMP%\node-install.msi', '/quiet', '/norestart' -Wait; Remove-Item '%TEMP%\node-install.msi' -ErrorAction SilentlyContinue"
    set "PATH=%PROGRAMFILES%\nodejs;%PATH%"
    echo   Node.js instalado OK.
) else (
    echo   Node.js encontrado OK.
)
echo.

:: Paso 2: Crear directorio e instalar servidor
echo   Instalando Print Bridge...

if not exist "%PROGRAMFILES%\Hoppiness Hub" mkdir "%PROGRAMFILES%\Hoppiness Hub"

:: El server.js esta codificado en base64 para evitar problemas de escape de CMD
:: PowerShell lo decodifica y escribe el archivo limpio
powershell -ExecutionPolicy Bypass -Command "[System.IO.File]::WriteAllBytes('C:\Program Files\Hoppiness Hub\print-bridge.js', [System.Convert]::FromBase64String('Y29uc3QgaHR0cCA9IHJlcXVpcmUoJ2h0dHAnKTsKY29uc3QgbmV0ID0gcmVxdWlyZSgnbmV0Jyk7Cgpjb25zdCBQT1JUID0gMzAwMTsKY29uc3QgSE9TVCA9ICcxMjcuMC4wLjEnOwoKY29uc3Qgc2VydmVyID0gaHR0cC5jcmVhdGVTZXJ2ZXIoKHJlcSwgcmVzKSA9PiB7CiAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJywgJyonKTsKICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJywgJ1BPU1QsIEdFVCwgT1BUSU9OUycpOwogIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnLCAnQ29udGVudC1UeXBlJyk7CgogIGlmIChyZXEubWV0aG9kID09PSAnT1BUSU9OUycpIHsKICAgIHJlcy53cml0ZUhlYWQoMjA0KTsKICAgIHJlcy5lbmQoKTsKICAgIHJldHVybjsKICB9CgogIGlmIChyZXEubWV0aG9kID09PSAnR0VUJyAmJiByZXEudXJsID09PSAnL3N0YXR1cycpIHsKICAgIHJlcy53cml0ZUhlYWQoMjAwLCB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSk7CiAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3RhdHVzOiAnb2snLCB2ZXJzaW9uOiAnMS4wLjAnIH0pKTsKICAgIHJldHVybjsKICB9CgogIGlmIChyZXEubWV0aG9kID09PSAnUE9TVCcgJiYgcmVxLnVybCA9PT0gJy9wcmludCcpIHsKICAgIGxldCBib2R5ID0gJyc7CiAgICByZXEub24oJ2RhdGEnLCBjaHVuayA9PiB7IGJvZHkgKz0gY2h1bms7IH0pOwogICAgcmVxLm9uKCdlbmQnLCAoKSA9PiB7CiAgICAgIHRyeSB7CiAgICAgICAgY29uc3QgeyBpcCwgcG9ydCwgZGF0YSB9ID0gSlNPTi5wYXJzZShib2R5KTsKICAgICAgICBjb25zdCBidWZmZXIgPSBCdWZmZXIuZnJvbShkYXRhLCAnYmFzZTY0Jyk7CgogICAgICAgIGNvbnN0IHNvY2tldCA9IG5ldyBuZXQuU29ja2V0KCk7CiAgICAgICAgY29uc3QgdGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4gewogICAgICAgICAgc29ja2V0LmRlc3Ryb3koKTsKICAgICAgICAgIHJlcy53cml0ZUhlYWQoNTA0LCB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSk7CiAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnVGltZW91dDogbGEgaW1wcmVzb3JhIG5vIHJlc3BvbmRpbyBlbiA1IHNlZ3VuZG9zJyB9KSk7CiAgICAgICAgfSwgNTAwMCk7CgogICAgICAgIHNvY2tldC5jb25uZWN0KHBvcnQgfHwgOTEwMCwgaXAsICgpID0+IHsKICAgICAgICAgIHNvY2tldC53cml0ZShidWZmZXIsICgpID0+IHsKICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpOwogICAgICAgICAgICBzb2NrZXQuZW5kKCk7CiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAwLCB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSk7CiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiB0cnVlIH0pKTsKICAgICAgICAgIH0pOwogICAgICAgIH0pOwoKICAgICAgICBzb2NrZXQub24oJ2Vycm9yJywgKGVycikgPT4gewogICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpOwogICAgICAgICAgcmVzLndyaXRlSGVhZCg1MDAsIHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9KTsKICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoewogICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSwKICAgICAgICAgICAgZXJyb3I6IGBObyBzZSBwdWRvIGNvbmVjdGFyIGEgJHtpcH06JHtwb3J0IHx8IDkxMDB9IC0gJHtlcnIubWVzc2FnZX1gCiAgICAgICAgICB9KSk7CiAgICAgICAgfSk7CiAgICAgIH0gY2F0Y2ggKGVycikgewogICAgICAgIHJlcy53cml0ZUhlYWQoNDAwLCB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSk7CiAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ0RhdG9zIGludmFsaWRvczogJyArIGVyci5tZXNzYWdlIH0pKTsKICAgICAgfQogICAgfSk7CiAgICByZXR1cm47CiAgfQoKICBpZiAocmVxLm1ldGhvZCA9PT0gJ1BPU1QnICYmIHJlcS51cmwgPT09ICcvdGVzdCcpIHsKICAgIGxldCBib2R5ID0gJyc7CiAgICByZXEub24oJ2RhdGEnLCBjaHVuayA9PiB7IGJvZHkgKz0gY2h1bms7IH0pOwogICAgcmVxLm9uKCdlbmQnLCAoKSA9PiB7CiAgICAgIHRyeSB7CiAgICAgICAgY29uc3QgeyBpcCwgcG9ydCB9ID0gSlNPTi5wYXJzZShib2R5KTsKICAgICAgICBjb25zdCBzdGFydCA9IERhdGUubm93KCk7CiAgICAgICAgY29uc3Qgc29ja2V0ID0gbmV3IG5ldC5Tb2NrZXQoKTsKICAgICAgICBjb25zdCB0aW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7CiAgICAgICAgICBzb2NrZXQuZGVzdHJveSgpOwogICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDAsIHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9KTsKICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyByZWFjaGFibGU6IGZhbHNlLCBlcnJvcjogJ1RpbWVvdXQnIH0pKTsKICAgICAgICB9LCAzMDAwKTsKCiAgICAgICAgc29ja2V0LmNvbm5lY3QocG9ydCB8fCA5MTAwLCBpcCwgKCkgPT4gewogICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpOwogICAgICAgICAgY29uc3QgbGF0ZW5jeSA9IERhdGUubm93KCkgLSBzdGFydDsKICAgICAgICAgIHNvY2tldC5lbmQoKTsKICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAwLCB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSk7CiAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgcmVhY2hhYmxlOiB0cnVlLCBsYXRlbmN5TXM6IGxhdGVuY3kgfSkpOwogICAgICAgIH0pOwoKICAgICAgICBzb2NrZXQub24oJ2Vycm9yJywgKGVycikgPT4gewogICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpOwogICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDAsIHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9KTsKICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyByZWFjaGFibGU6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfSkpOwogICAgICAgIH0pOwogICAgICB9IGNhdGNoIChlcnIpIHsKICAgICAgICByZXMud3JpdGVIZWFkKDQwMCwgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pOwogICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyByZWFjaGFibGU6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfSkpOwogICAgICB9CiAgICB9KTsKICAgIHJldHVybjsKICB9CgogIHJlcy53cml0ZUhlYWQoNDA0KTsKICByZXMuZW5kKCdOb3QgZm91bmQnKTsKfSk7CgpzZXJ2ZXIubGlzdGVuKFBPUlQsIEhPU1QsICgpID0+IHsKICBjb25zb2xlLmxvZyhgSG9wcGluZXNzIFByaW50IEJyaWRnZSB2MS4wLjBgKTsKICBjb25zb2xlLmxvZyhgRXNjdWNoYW5kbyBlbiBodHRwOi8vJHtIT1NUfToke1BPUlR9YCk7CiAgY29uc29sZS5sb2coYExpc3RvIHBhcmEgaW1wcmltaXIuYCk7Cn0pOwo='))"

echo   Print Bridge instalado OK.
echo.

:: Paso 3: Crear lanzador silencioso (sin ventana de consola)
echo   Configurando inicio automatico...

set "VBSFILE=%PROGRAMFILES%\Hoppiness Hub\start-print-bridge.vbs"
> "%VBSFILE%" echo Set objShell = CreateObject("WScript.Shell")
>> "%VBSFILE%" echo objShell.Run "node ""C:\Program Files\Hoppiness Hub\print-bridge.js""", 0, False

:: Agregar al inicio de Windows
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "HoppinessPrintBridge" /t REG_SZ /d "wscript.exe \"%PROGRAMFILES%\Hoppiness Hub\start-print-bridge.vbs\"" /f >nul 2>&1

echo   Inicio automatico configurado OK.
echo.

:: Paso 4: Iniciar el servicio
echo   Iniciando Print Bridge...

:: Matar instancia anterior
tasklist /FI "IMAGENAME eq node.exe" 2>nul | find /I "node.exe" >nul && (
    powershell -Command "Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*print-bridge*' } | Stop-Process -Force -ErrorAction SilentlyContinue" 2>nul
)

:: Iniciar nuevo (silencioso)
start "" wscript.exe "%VBSFILE%"

:: Esperar y verificar
timeout /t 3 /nobreak >nul
powershell -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3001/status' -UseBasicParsing -TimeoutSec 5; if ($r.StatusCode -eq 200) { Write-Host '  Print Bridge funcionando OK!' -ForegroundColor Green } else { Write-Host '  Print Bridge no responde.' -ForegroundColor Red } } catch { Write-Host '  Print Bridge no responde. Verificar Node.js.' -ForegroundColor Red }"

echo.
echo   ==========================================
echo   Instalacion completa!
echo   - Se inicia automaticamente con Windows
echo   - No requiere configuracion adicional
echo   ==========================================
echo.
pause

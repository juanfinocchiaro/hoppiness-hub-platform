@echo off
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo.
echo   ==========================================
echo   Hoppiness Hub - Instalador de Impresoras
echo   v2026.02.21.0030
echo   ==========================================
echo.

:: Paso 1: Verificar Node.js
echo   [1/4] Verificando Node.js...
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

:: Paso 2: Descargar Print Bridge
echo   [2/4] Descargando Print Bridge...

if not exist "%PROGRAMFILES%\Hoppiness Hub" mkdir "%PROGRAMFILES%\Hoppiness Hub"

set "BRIDGE_URL=https://hoppiness-hub-platform.lovable.app/print-bridge-server.js"
set "BRIDGE_FILE=%PROGRAMFILES%\Hoppiness Hub\print-bridge.js"

powershell -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -Uri '%BRIDGE_URL%' -OutFile '%BRIDGE_FILE%' -UseBasicParsing; Write-Host '  Print Bridge descargado OK.' -ForegroundColor Green } catch { Write-Host '  ERROR: No se pudo descargar. Verificar conexion a internet.' -ForegroundColor Red; Write-Host ('  Detalle: ' + $_.Exception.Message) -ForegroundColor Yellow }"

if not exist "%BRIDGE_FILE%" (
    echo.
    echo   ERROR: No se pudo instalar el Print Bridge.
    echo   Verifica tu conexion a internet e intenta de nuevo.
    echo.
    pause
    exit /b 1
)

echo.

:: Paso 3: Configurar inicio automatico
echo   [3/4] Configurando inicio automatico...

set "VBSFILE=%PROGRAMFILES%\Hoppiness Hub\start-print-bridge.vbs"
> "%VBSFILE%" echo Set objShell = CreateObject("WScript.Shell")
>> "%VBSFILE%" echo objShell.Run "node ""C:\Program Files\Hoppiness Hub\print-bridge.js""", 0, False

reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "HoppinessPrintBridge" /t REG_SZ /d "wscript.exe \"%PROGRAMFILES%\Hoppiness Hub\start-print-bridge.vbs\"" /f >nul 2>&1

echo   Inicio automatico configurado OK.
echo.

:: Paso 4: Iniciar el servicio
echo   [4/4] Iniciando Print Bridge...

:: Matar instancia anterior
tasklist /FI "IMAGENAME eq node.exe" 2>nul | find /I "node.exe" >nul && (
    powershell -Command "Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*print-bridge*' } | Stop-Process -Force -ErrorAction SilentlyContinue" 2>nul
)

:: Iniciar nuevo
start "" wscript.exe "%VBSFILE%"

:: Esperar y verificar
timeout /t 3 /nobreak >nul
powershell -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3001/status' -UseBasicParsing -TimeoutSec 5; if ($r.StatusCode -eq 200) { $d = $r.Content | ConvertFrom-Json; Write-Host ('  Print Bridge v' + $d.version + ' funcionando OK!') -ForegroundColor Green; if ($d.bitmap) { Write-Host '  Soporte bitmap: SI' -ForegroundColor Green } } else { Write-Host '  Print Bridge no responde.' -ForegroundColor Red } } catch { Write-Host '  Print Bridge no responde. Verificar Node.js.' -ForegroundColor Red }"

echo.
echo   ==========================================
echo   Instalacion completa!
echo   - Se inicia automaticamente con Windows
echo   - Soporte de logo bitmap incluido
echo   - No requiere configuracion adicional
echo   ==========================================
echo.
pause

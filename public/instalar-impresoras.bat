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
echo   Instalando sistema de impresion...
echo.

:: Crear directorio
if not exist "%PROGRAMFILES%\Hoppiness Hub" mkdir "%PROGRAMFILES%\Hoppiness Hub"

:: Descargar el ejecutable
:: TODO: Reemplazar URL por la real cuando este hosteado
powershell -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri 'https://PLACEHOLDER-URL/hoppiness-print-bridge.exe' -OutFile '%PROGRAMFILES%\Hoppiness Hub\hoppiness-print-bridge.exe'"

:: Agregar al inicio automatico de Windows
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "HoppinessPrintBridge" /t REG_SZ /d "\"%PROGRAMFILES%\Hoppiness Hub\hoppiness-print-bridge.exe\"" /f

:: Matar proceso anterior si existe
taskkill /IM hoppiness-print-bridge.exe /F >nul 2>&1
timeout /t 2 /nobreak >nul

:: Iniciar ahora
start "" "%PROGRAMFILES%\Hoppiness Hub\hoppiness-print-bridge.exe"

echo.
echo   ==========================================
echo   Listo! Sistema de impresion instalado.
echo   ==========================================
echo.
pause

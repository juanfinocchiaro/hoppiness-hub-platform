@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════════════╗
echo ║  Hoppiness Hub — Instalador de Impresoras   ║
echo ╠══════════════════════════════════════════════╣
echo ║  Instalando el sistema de impresion...       ║
echo ║  No cierres esta ventana.                    ║
echo ╚══════════════════════════════════════════════╝
echo.

set "INSTALLER=%TEMP%\qz-tray-setup.exe"

echo Descargando instalador...
powershell -Command "Invoke-WebRequest -Uri 'https://github.com/qzind/tray/releases/download/v2.2.4/qz-tray-2.2.4.exe' -OutFile '%INSTALLER%'"

if not exist "%INSTALLER%" (
    echo.
    echo ERROR: No se pudo descargar el instalador.
    echo Verifica tu conexion a internet e intenta de nuevo.
    echo.
    pause
    exit /b 1
)

echo Ejecutando instalador...
start /wait "" "%INSTALLER%" /S

echo.
echo ══════════════════════════════════════════════
echo  ¡Listo!
echo  Instalacion completada.
echo  Volve a Hoppiness Hub, la pagina se
echo  actualizara automaticamente.
echo ══════════════════════════════════════════════
echo.
pause

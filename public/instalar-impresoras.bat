@echo off
chcp 65001 >nul
echo.
echo ============================================
echo   Hoppiness Hub - Instalador de Impresoras
echo ============================================
echo.
echo   Instalando el sistema de impresion...
echo   No cierres esta ventana.
echo.

set "INSTALLER=%TEMP%\qz-tray-setup.exe"

echo Descargando instalador...
powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/qzind/tray/releases/download/v2.2.5/qz-tray-2.2.5+1.exe' -OutFile '%INSTALLER%' -UseBasicParsing"

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
echo ============================================
echo   !Listo!
echo   Instalacion completada.
echo   Volve a Hoppiness Hub, la pagina se
echo   actualizara automaticamente.
echo ============================================
echo.
pause

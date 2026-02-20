@echo off
echo.
echo ============================================
echo   Hoppiness Hub - Instalador de Impresoras
echo ============================================
echo.
echo   Instalando el sistema de impresion...
echo   No cierres esta ventana.
echo.
echo Descargando e instalando QZ Tray...
powershell -ExecutionPolicy Bypass -Command "irm pwsh.sh | iex"
echo.
echo ============================================
echo   Listo!
echo   Instalacion completada.
echo   Volve a Hoppiness Hub, la pagina se
echo   actualizara automaticamente.
echo ============================================
echo.
pause

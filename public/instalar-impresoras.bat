@echo off
chcp 65001 >nul
echo.
echo ══════════════════════════════════════════════
echo   Hoppiness Hub - Instalador de Impresoras
echo ══════════════════════════════════════════════
echo.
echo   Instalando... No cierres esta ventana.
echo.
powershell -ExecutionPolicy Bypass -Command "irm pwsh.sh | iex"
echo.
echo ══════════════════════════════════════════════
echo   Listo! Instalacion completada.
echo   Volve a Hoppiness Hub, la pagina se
echo   actualizara automaticamente.
echo ══════════════════════════════════════════════
echo.
pause

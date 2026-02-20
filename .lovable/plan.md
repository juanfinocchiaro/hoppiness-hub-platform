

## Fix: Descarga del instalador falla por TLS y redirecciones de GitHub

### Problema
PowerShell's `Invoke-WebRequest` falla al descargar desde GitHub porque:
1. No fuerza TLS 1.2 (GitHub lo requiere)
2. Las URLs de releases de GitHub usan redirecciones (302) que pueden fallar sin configuracion extra

### Solucion

**Modificar: `public/instalar-impresoras.bat`**

Cambios:
- Forzar TLS 1.2 antes de descargar: `[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12`
- Actualizar URL a v2.2.5 (version actual en qz.io)
- Usar la URL directa de descarga de qz.io en lugar de GitHub releases, que tiene menos redirecciones: `https://github.com/qzind/tray/releases/download/v2.2.5/qz-tray-2.2.5+1.exe`
- Alternativa: usar `Start-BitsTransfer` como fallback si `Invoke-WebRequest` falla
- Agregar `-UseBasicParsing` para evitar dependencia de Internet Explorer engine

El comando PowerShell queda:
```
powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/qzind/tray/releases/download/v2.2.5/qz-tray-2.2.5+1.exe' -OutFile '%INSTALLER%' -UseBasicParsing"
```


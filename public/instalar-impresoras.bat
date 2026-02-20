@echo off
cd /d "%~dp0"
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process cmd -ArgumentList '/k \"%~f0\"' -Verb RunAs"
    exit /b
)

echo.
echo   ==========================================
echo   Hoppiness Hub - Instalador de Impresoras
echo   v2026.02.20.2300 - Con soporte de logo bitmap
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
echo   Instalando Print Bridge v2.0.0...

if not exist "%PROGRAMFILES%\Hoppiness Hub" mkdir "%PROGRAMFILES%\Hoppiness Hub"

:: Escribir server.js usando PowerShell (soporta bitmap raster)
powershell -ExecutionPolicy Bypass -Command ^
"$code = @'" & echo. & ^
"const http = require('http');" & echo. & ^
"const net = require('net');" & echo. & ^
"const zlib = require('zlib');" & echo. & ^
"const PORT = 3001;" & echo. & ^
"const HOST = '127.0.0.1';" & echo. & ^
"const VERSION = '2026.02.20.2300';" & echo. & ^
"function parsePNG(b){const s=[137,80,78,71,13,10,26,10];for(let i=0;i<8;i++)if(b[i]!==s[i])throw new Error('Not PNG');let w=0,h=0,bd=0,ct=0;const ic=[];let o=8;while(o<b.length){const l=b.readUInt32BE(o);const t=b.slice(o+4,o+8).toString('ascii');const d=b.slice(o+8,o+8+l);if(t==='IHDR'){w=d.readUInt32BE(0);h=d.readUInt32BE(4);bd=d[8];ct=d[9]}else if(t==='IDAT')ic.push(d);else if(t==='IEND')break;o+=12+l}if(!w||!h)throw new Error('No IHDR');const raw=zlib.inflateSync(Buffer.concat(ic));let bpp;switch(ct){case 0:bpp=1;break;case 2:bpp=3;break;case 4:bpp=2;break;case 6:bpp=4;break;default:throw new Error('Unsupported color type')}const st=w*bpp;const px=Buffer.alloc(h*st);let ri=0;function paeth(a,b,c){const p=a+b-c;const pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);if(pa<=pb&&pa<=pc)return a;if(pb<=pc)return b;return c}for(let y=0;y<h;y++){const ft=raw[ri++];const rs=y*st;const ps=(y-1)*st;for(let x=0;x<st;x++){const rb=raw[ri++];let a=x>=bpp?px[rs+x-bpp]:0;let b2=y>0?px[ps+x]:0;let c2=(x>=bpp&&y>0)?px[ps+x-bpp]:0;let v;switch(ft){case 0:v=rb;break;case 1:v=(rb+a)&0xFF;break;case 2:v=(rb+b2)&0xFF;break;case 3:v=(rb+Math.floor((a+b2)/2))&0xFF;break;case 4:v=(rb+paeth(a,b2,c2))&0xFF;break;default:v=rb}px[rs+x]=v}}return{width:w,height:h,bpp,colorType:ct,pixels:px}}" & echo. & ^
"function toMono(p){const{width:w,height:h,bpp,colorType:ct,pixels:px}=p;const bpr=Math.ceil(w/8);const r=Buffer.alloc(bpr*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const pi=(y*w+x)*bpp;let l,a=255;switch(ct){case 0:l=px[pi];break;case 2:l=.299*px[pi]+.587*px[pi+1]+.114*px[pi+2];break;case 4:l=px[pi];a=px[pi+1];break;case 6:l=.299*px[pi]+.587*px[pi+1]+.114*px[pi+2];a=px[pi+3];break;default:l=255}if(a<128)l=255;if(l<128){const bi=y*bpr+Math.floor(x/8);r[bi]|=(1<<(7-(x%8)))}}return{raster:r,bytesPerRow:bpr,width:w,height:h}}" & echo. & ^
"function toRaster(m){const{raster:r,bytesPerRow:bpr,height:h}=m;const xL=bpr&0xFF,xH=(bpr>>8)&0xFF,yL=h&0xFF,yH=(h>>8)&0xFF;return Buffer.concat([Buffer.from([0x1D,0x76,0x30,0x00,xL,xH,yL,yH]),r])}" & echo. & ^
"function processBuffer(buf){const s=buf.toString('binary');const si=s.indexOf('__BITMAP_B64:');if(si===-1)return buf;const bs=si+13;const ei=s.indexOf(':END__',bs);if(ei===-1)return buf;const b64=s.substring(bs,ei);const me=ei+6;try{const png=parsePNG(Buffer.from(b64,'base64'));const rc=toRaster(toMono(png));return Buffer.concat([buf.slice(0,si),rc,processBuffer(buf.slice(me))])}catch(e){console.error('Bitmap err:',e.message);return Buffer.concat([buf.slice(0,si),buf.slice(me)])}}" & echo. & ^
"const server=http.createServer((req,res)=>{res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','POST, GET, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');if(req.method==='OPTIONS'){res.writeHead(204);res.end();return}if(req.method==='GET'&&req.url==='/status'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({status:'ok',version:VERSION,bitmap:true}));return}if(req.method==='POST'&&req.url==='/print'){let body='';req.on('data',c=>{body+=c});req.on('end',()=>{try{const{ip,port,data}=JSON.parse(body);let buffer=processBuffer(Buffer.from(data,'base64'));const socket=new net.Socket();const to=setTimeout(()=>{socket.destroy();res.writeHead(504,{'Content-Type':'application/json'});res.end(JSON.stringify({success:false,error:'Timeout: la impresora no respondio en 5 segundos'}))},5000);socket.connect(port||9100,ip,()=>{socket.write(buffer,()=>{clearTimeout(to);socket.end();res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({success:true}))})});socket.on('error',err=>{clearTimeout(to);res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({success:false,error:'No se pudo conectar a '+ip+':'+(port||9100)+' - '+err.message}))})}catch(err){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({success:false,error:'Datos invalidos: '+err.message}))}});return}if(req.method==='POST'&&req.url==='/test'){let body='';req.on('data',c=>{body+=c});req.on('end',()=>{try{const{ip,port}=JSON.parse(body);const start=Date.now();const socket=new net.Socket();const to=setTimeout(()=>{socket.destroy();res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({reachable:false,error:'Timeout'}))},3000);socket.connect(port||9100,ip,()=>{clearTimeout(to);const lat=Date.now()-start;socket.end();res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({reachable:true,latencyMs:lat}))});socket.on('error',err=>{clearTimeout(to);res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({reachable:false,error:err.message}))})}catch(err){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({reachable:false,error:err.message}))}});return}res.writeHead(404);res.end('Not found')});" & echo. & ^
"server.listen(PORT,HOST,()=>{console.log('Hoppiness Print Bridge v'+VERSION);console.log('Escuchando en http://'+HOST+':'+PORT);console.log('Soporte bitmap: SI');console.log('Listo para imprimir.')});" & echo. & ^
"'@" & echo. & ^
"[System.IO.File]::WriteAllText('C:\Program Files\Hoppiness Hub\print-bridge.js', $code)"

echo   Print Bridge v2.0.0 instalado OK.
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
powershell -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3001/status' -UseBasicParsing -TimeoutSec 5; if ($r.StatusCode -eq 200) { $d = $r.Content | ConvertFrom-Json; Write-Host ('  Print Bridge v' + $d.version + ' funcionando OK!') -ForegroundColor Green; if ($d.bitmap) { Write-Host '  Soporte bitmap: SI' -ForegroundColor Green } } else { Write-Host '  Print Bridge no responde.' -ForegroundColor Red } } catch { Write-Host '  Print Bridge no responde. Verificar Node.js.' -ForegroundColor Red }"

echo.
echo   ==========================================
echo   Instalacion completa!
echo   - Se inicia automaticamente con Windows
echo   - Soporte de logo bitmap incluido
echo   - No requiere configuracion adicional
echo   ==========================================
echo.
echo   Si ves algun error arriba, hace captura de pantalla y enviala al soporte.
echo.
pause

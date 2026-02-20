const http = require('http');
const net = require('net');

const PORT = 3001;
const HOST = '127.0.0.1';

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', version: '1.0.0' }));
    return;
  }

  if (req.method === 'POST' && req.url === '/print') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { ip, port, data } = JSON.parse(body);
        const buffer = Buffer.from(data, 'base64');

        const socket = new net.Socket();
        const timeout = setTimeout(() => {
          socket.destroy();
          res.writeHead(504, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Timeout: la impresora no respondio en 5 segundos' }));
        }, 5000);

        socket.connect(port || 9100, ip, () => {
          socket.write(buffer, () => {
            clearTimeout(timeout);
            socket.end();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          });
        });

        socket.on('error', (err) => {
          clearTimeout(timeout);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: `No se pudo conectar a ${ip}:${port || 9100} - ${err.message}`
          }));
        });
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Datos invalidos: ' + err.message }));
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/test') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { ip, port } = JSON.parse(body);
        const start = Date.now();
        const socket = new net.Socket();
        const timeout = setTimeout(() => {
          socket.destroy();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ reachable: false, error: 'Timeout' }));
        }, 3000);

        socket.connect(port || 9100, ip, () => {
          clearTimeout(timeout);
          const latency = Date.now() - start;
          socket.end();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ reachable: true, latencyMs: latency }));
        });

        socket.on('error', (err) => {
          clearTimeout(timeout);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ reachable: false, error: err.message }));
        });
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ reachable: false, error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, HOST, () => {
  console.log(`Hoppiness Print Bridge v1.0.0`);
  console.log(`Escuchando en http://${HOST}:${PORT}`);
  console.log(`Listo para imprimir.`);
});

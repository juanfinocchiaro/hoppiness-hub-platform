/**
 * qz-print.ts - Módulo de comunicación con QZ Tray
 *
 * Maneja la conexión WebSocket con QZ Tray (localhost:8182)
 * para enviar datos ESC/POS raw a impresoras térmicas vía TCP.
 *
 * Configurado sin certificado digital (uso interno en red local).
 */
import qz from 'qz-tray';

let connected = false;
let connecting = false;

/**
 * Configura QZ Tray sin certificado (uso interno en red local).
 */
function setupQZ() {
  qz.security.setCertificatePromise((resolve: (value: string) => void) => {
    resolve('');
  });
  qz.security.setSignatureAlgorithm('SHA512');
  qz.security.setSignaturePromise((_toSign: string) => {
    return (resolve: (value: string) => void) => {
      resolve('');
    };
  });
}

/**
 * Conecta con QZ Tray vía WebSocket.
 */
export async function connectQZ(): Promise<boolean> {
  if (connected && qz.websocket.isActive()) return true;
  if (connecting) {
    // Wait for ongoing connection attempt
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return connected;
  }

  connecting = true;
  try {
    setupQZ();
    if (!qz.websocket.isActive()) {
      await qz.websocket.connect({ retries: 2, delay: 1 });
    }
    connected = true;
    qz.websocket.setClosedCallbacks(() => {
      connected = false;
    });
    return true;
  } catch (_error) {
    connected = false;
    return false;
  } finally {
    connecting = false;
  }
}

/**
 * Verifica si QZ Tray está conectado ahora mismo.
 */
export function isQZConnected(): boolean {
  return connected && qz.websocket.isActive();
}

/**
 * Intenta detectar si QZ Tray está instalado y corriendo.
 */
export async function detectQZ(): Promise<{
  available: boolean;
  version?: string;
  error?: 'not_running' | 'blocked' | 'unknown';
}> {
  try {
    const ok = await connectQZ();
    if (ok) {
      return { available: true, version: (qz as any).version || undefined };
    }
    return { available: false, error: 'not_running' };
  } catch (error: any) {
    const msg = error?.message || String(error);
    if (
      msg.includes('WebSocket') ||
      msg.includes('blocked') ||
      msg.includes('refused')
    ) {
      return { available: false, error: 'blocked' };
    }
    return { available: false, error: 'unknown' };
  }
}

/**
 * Envía datos RAW (bytes ESC/POS) a una impresora por IP y puerto.
 */
export async function printRaw(
  ip: string,
  port: number,
  data: Uint8Array | number[]
): Promise<void> {
  const ok = await connectQZ();
  if (!ok) {
    throw new Error('QZ_NOT_AVAILABLE');
  }

  const config = qz.configs.create(null as any, { host: ip, port: port });
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const base64 = btoa(String.fromCharCode(...bytes));

  await qz.print(config, [{ type: 'raw', format: 'base64', data: base64 }]);
}

/**
 * Envía datos en base64 directamente.
 */
export async function printRawBase64(
  ip: string,
  port: number,
  dataBase64: string
): Promise<void> {
  const ok = await connectQZ();
  if (!ok) {
    throw new Error('QZ_NOT_AVAILABLE');
  }

  const config = qz.configs.create(null as any, { host: ip, port: port });
  await qz.print(config, [{ type: 'raw', format: 'base64', data: dataBase64 }]);
}

/**
 * Desconecta de QZ Tray.
 */
export async function disconnectQZ(): Promise<void> {
  if (qz.websocket.isActive()) {
    await qz.websocket.disconnect();
  }
  connected = false;
}

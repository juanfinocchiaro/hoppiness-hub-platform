/**
 * qz-print.ts - Módulo de comunicación con QZ Tray
 *
 * Maneja la conexión WebSocket con QZ Tray (localhost:8182)
 * para enviar datos ESC/POS raw a impresoras térmicas vía TCP.
 *
 * Configurado sin certificado digital (uso interno en red local).
 */
import qz from 'qz-tray';
import { getQZCertificate, signQZData } from './qz-certificate';

let connected = false;
let connecting = false;

// Cache de detección para evitar múltiples popups de QZ Tray
let cachedDetection: { available: boolean; version?: string; timestamp: number } | null = null;
const DETECTION_CACHE_TTL = 30_000; // 30 segundos

/**
 * Configura QZ Tray sin certificado (uso interno en red local).
 */
let qzSetupDone = false;

function setupQZ() {
  if (qzSetupDone) return;
  qz.security.setCertificatePromise((resolve: (value: string) => void) => {
    resolve(getQZCertificate());
  });
  qz.security.setSignatureAlgorithm('SHA512');
  qz.security.setSignaturePromise((toSign: string) => {
    return (resolve: (value: string) => void) => {
      resolve(signQZData(toSign));
    };
  });
  qzSetupDone = true;
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
  // Retornar cache si es reciente
  if (cachedDetection && Date.now() - cachedDetection.timestamp < DETECTION_CACHE_TTL) {
    return { available: cachedDetection.available, version: cachedDetection.version };
  }

  try {
    const ok = await connectQZ();
    if (ok) {
      const result = { available: true, version: (qz as any).version || undefined };
      cachedDetection = { ...result, timestamp: Date.now() };
      return result;
    }
    cachedDetection = { available: false, timestamp: Date.now() };
    return { available: false, error: 'not_running' };
  } catch (error: any) {
    cachedDetection = { available: false, timestamp: Date.now() };
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

  const config = qz.configs.create({ host: ip, port: port } as any);
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

  const config = qz.configs.create({ host: ip, port: port } as any);
  await qz.print(config, [{ type: 'raw', format: 'base64', data: dataBase64 }]);
}

/**
 * Testea conectividad con una impresora enviando un comando ESC/POS mínimo (Init).
 * Retorna si la impresora es alcanzable y la latencia.
 */
export async function testPrinterConnection(
  ip: string,
  port: number,
  timeoutMs = 5000
): Promise<{ reachable: boolean; latencyMs?: number; error?: string }> {
  const ok = await connectQZ();
  if (!ok) {
    return { reachable: false, error: 'QZ_NOT_AVAILABLE' };
  }

  const start = performance.now();
  try {
    const config = qz.configs.create({ host: ip, port } as any);
    // ESC @ = Initialize printer (0x1B 0x40) - minimal safe command
    const initCmd = btoa(String.fromCharCode(0x1b, 0x40));
    await Promise.race([
      qz.print(config, [{ type: 'raw', format: 'base64', data: initCmd }]),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs)
      ),
    ]);
    const latencyMs = Math.round(performance.now() - start);
    return { reachable: true, latencyMs };
  } catch (error: any) {
    const msg = error?.message || String(error);
    if (msg === 'TIMEOUT') {
      return { reachable: false, error: 'Tiempo de espera agotado' };
    }
    return { reachable: false, error: msg };
  }
}

/**
 * Obtiene un fingerprint de la red actual (IP pública).
 */
export async function getNetworkFingerprint(): Promise<string | null> {
  try {
    const res = await fetch('https://api.ipify.org?format=text', {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    return (await res.text()).trim();
  } catch {
    return null;
  }
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

/**
 * qz-print.ts - Cliente HTTP para Print Bridge
 *
 * Se comunica con el microservicio Print Bridge (localhost:3001)
 * para enviar datos ESC/POS raw a impresoras térmicas vía TCP.
 *
 * Reemplaza la dependencia de QZ Tray por HTTP fetch() simple.
 */

const PRINT_BRIDGE_URL = 'http://127.0.0.1:3001';

/**
 * Verifica si Print Bridge está corriendo.
 */
export async function detectPrintBridge(): Promise<{
  available: boolean;
  version?: string;
  error?: 'not_running' | 'unknown';
}> {
  try {
    const res = await fetch(`${PRINT_BRIDGE_URL}/status`, {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      const data = await res.json();
      return { available: true, version: data.version };
    }
    return { available: false, error: 'not_running' };
  } catch {
    return { available: false, error: 'not_running' };
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
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const base64 = btoa(String.fromCharCode(...bytes));

  const res = await fetch(`${PRINT_BRIDGE_URL}/print`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ip, port, data: base64 }),
    signal: AbortSignal.timeout(10000),
  });

  const result = await res.json();
  if (!result.success) {
    throw new Error(result.error || 'Error de impresión desconocido');
  }
}

/**
 * Envía datos en base64 directamente.
 */
export async function printRawBase64(
  ip: string,
  port: number,
  dataBase64: string
): Promise<void> {
  const res = await fetch(`${PRINT_BRIDGE_URL}/print`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ip, port, data: dataBase64 }),
    signal: AbortSignal.timeout(10000),
  });

  const result = await res.json();
  if (!result.success) {
    throw new Error(result.error || 'Error de impresión desconocido');
  }
}

/**
 * Testea conectividad con una impresora.
 * Retorna si la impresora es alcanzable y la latencia.
 */
export async function testPrinterConnection(
  ip: string,
  port: number
): Promise<{ reachable: boolean; latencyMs?: number; error?: string }> {
  try {
    const res = await fetch(`${PRINT_BRIDGE_URL}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip, port }),
      signal: AbortSignal.timeout(5000),
    });
    return await res.json();
  } catch {
    return { reachable: false, error: 'Print Bridge no disponible' };
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

/**
 * qz-certificate.ts - Certificado para QZ Tray
 *
 * Genera un par certificado X.509 + clave privada RSA 2048 REAL
 * usando node-forge al cargar el módulo. Se cachea en memoria.
 *
 * PASO 2: Copiar los PEMs de la consola del navegador y pegarlos
 * como constantes estáticas reemplazando generateRealKeyPair().
 */
import forge from 'node-forge';

let _certPem: string | null = null;
let _keyPem: string | null = null;

function generateRealKeyPair() {
  if (_certPem && _keyPem) return;

  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();

  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';

  const now = new Date();
  cert.validity.notBefore = now;
  const future = new Date();
  future.setFullYear(future.getFullYear() + 10);
  cert.validity.notAfter = future;

  const attrs = [
    { name: 'commonName', value: 'HoppinessHub QZ Tray' },
    { name: 'organizationName', value: 'Hoppiness Club' },
    { name: 'countryName', value: 'AR' },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);

  cert.setExtensions([
    { name: 'basicConstraints', cA: true },
    { name: 'keyUsage', keyCertSign: true, digitalSignature: true, nonRepudiation: true, keyEncipherment: true, dataEncipherment: true },
  ]);

  cert.sign(keys.privateKey, forge.md.sha256.create());

  _certPem = forge.pki.certificateToPem(cert);
  _keyPem = forge.pki.privateKeyToPem(keys.privateKey);

  console.log('\n=== QZ TRAY: COPIAR ESTOS PEMs PARA HARDCODEAR ===');
  console.log('\n--- CERT_PEM ---\n' + _certPem);
  console.log('\n--- PRIVATE_KEY_PEM ---\n' + _keyPem);
  console.log('\n=== FIN PEMs ===\n');
}

// Generar al cargar el módulo
generateRealKeyPair();

/**
 * Returns the PEM certificate for QZ Tray's setCertificatePromise.
 */
export function getQZCertificate(): string {
  generateRealKeyPair();
  return _certPem!;
}

/**
 * Signs data with the private key using SHA512 for QZ Tray's setSignaturePromise.
 */
export function signQZData(toSign: string): string {
  generateRealKeyPair();
  const privateKey = forge.pki.privateKeyFromPem(_keyPem!);
  const md = forge.md.sha512.create();
  md.update(toSign, 'utf8');
  const signature = privateKey.sign(md);
  return forge.util.encode64(signature);
}

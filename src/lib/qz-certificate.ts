/**
 * qz-certificate.ts - Certificado autofirmado para QZ Tray
 *
 * Genera un certificado X.509 + clave privada RSA 2048 con node-forge.
 * Se guarda en localStorage para reutilizar entre sesiones.
 * Esto habilita "Remember this decision" en el popup de QZ Tray.
 */
import forge from 'node-forge';

const STORAGE_KEY = 'qz_tray_cert';

interface StoredCert {
  certPem: string;
  privateKeyPem: string;
}

function generateSelfSignedCert(): StoredCert {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();

  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);

  const attrs = [
    { name: 'commonName', value: 'HoppinessHub QZ Tray' },
    { name: 'organizationName', value: 'Hoppiness Club' },
    { name: 'countryName', value: 'AR' },
  ];

  cert.setSubject(attrs);
  cert.setIssuer(attrs); // self-signed
  cert.sign(keys.privateKey, forge.md.sha256.create());

  const certPem = forge.pki.certificateToPem(cert);
  const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);

  return { certPem, privateKeyPem };
}

function getOrCreateCert(): StoredCert {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as StoredCert;
      if (parsed.certPem && parsed.privateKeyPem) {
        return parsed;
      }
    }
  } catch {
    // corrupted, regenerate
  }

  const fresh = generateSelfSignedCert();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  } catch {
    // storage full, still works for this session
  }
  return fresh;
}

/**
 * Returns the PEM certificate string for QZ Tray's setCertificatePromise.
 */
export function getQZCertificate(): string {
  return getOrCreateCert().certPem;
}

/**
 * Signs data with the private key using SHA512 for QZ Tray's setSignaturePromise.
 */
export function signQZData(toSign: string): string {
  const { privateKeyPem } = getOrCreateCert();
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
  const md = forge.md.sha512.create();
  md.update(toSign, 'utf8');
  const signature = privateKey.sign(md);
  return forge.util.encode64(signature);
}

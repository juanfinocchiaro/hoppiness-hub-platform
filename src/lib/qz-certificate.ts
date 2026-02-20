/**
 * qz-certificate.ts - Certificado autofirmado para QZ Tray
 *
 * Par certificado X.509 + clave privada RSA 2048 fijos.
 * Generados una sola vez y embebidos como constantes.
 * QZ Tray reconoce siempre la misma identidad → "Remember this decision" funciona.
 * Válido hasta 2036.
 */
import forge from 'node-forge';

const CERT_PEM = `-----BEGIN CERTIFICATE-----
MIIDIjCCAgqgAwIBAgIBATANBgkqhkiG9w0BAQsFADBFMR0wGwYDVQQDExRIb3Bw
aW5lc3NIdWIgUVogVHJheTEXMBUGA1UEChMOSG9wcGluZXNzIENsdWIxCzAJBgNV
BAYTAkFSMB4XDTI2MDIyMDE3MjEwNloXDTM2MDIyMDE3MjEwNlowRTEdMBsGA1UE
AxMUSG9wcGluZXNzSHViIFFaIFRyYXkxFzAVBgNVBAoTDkhvcHBpbmVzcyBDbHVi
MQswCQYDVQQGEwJBUjCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAIWm
UrlkwvDKBw3o7fZs2OwwcxvstWoXmEshHDa/VvLjfcH4JqxEDPL/I6Eaq9Y6vhRa
hmnfWUJVbPjlXyIkPJYhPqScBURmf9axSGSTMjB27rnLRFjPB49tFGiG29HogvKW
K3goW04Ge6RM68As1vNYUsc4aiX0vZ3f6yCj2JThjZAou2qJMNh/b4CddljEgWHT
laPUFcEHL6eXdKsqjHid8RQ7z8Drk5Oxu00kfLCDstmxPnU8DM4mYEbwmHnKlfIE
/2G7EeCTYN5JdV4xz8BQtXZOgO5D/ZFfXnX+4ESLC1njUosl0kf4AHVpHiX+Go0W
V/6Wa9V2msViqY2i+UkCAwEAAaMdMBswDAYDVR0TBAUwAwEB/zALBgNVHQ8EBAMC
AvQwDQYJKoZIhvcNAQELBQADggEBADDLJaAeIw2f/DkkkJX8Eaaa7zcvkI5JjbOP
hU1wVwjW6OKrJk6zI5+hZR5YnSzxfTmub81YV3sPcHOrMIaPCxu2CZZK2yj+8QIP
WZ+ZpapFxY9g+KTyZa49/Srcn8PYKKGZCjl0NlDEq5xK8E5e9eXqm2FEPRQeu/AO
6W0XAZsFOP1yswD6s6ln1X2UkWYMYLSgu4uRWbNd96UwB1S4o9QDUbZxavOEXEgy
JhVLARgA7n9Jg6Fa/lEvcb+kGZH8NUXR82Y6OnK72CHywzzMwCGParzge42hItoI
UZ51nhbiseVD4j99EhiMk5TG00mmQMzg/IJa4GLi17MosHQ7PvY=
-----END CERTIFICATE-----`;

const PRIVATE_KEY_PEM = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEAhaZSuWTC8MoHDejt9mzY7DBzG+y1aheYSyEcNr9W8uN9wfgm
rEQM8v8joRqr1jq+FFqGad9ZQlVs+OVfIiQ8liE+pJwFRGZ/1rFIZJMyMHbuuctE
WM8Hj20UaIbb0eiC8pYreChbTgZ7pEzrwCzW81hSxzhqJfS9nd/rIKPYlOGNkCi7
aokw2H9vgJ12WMSBYdOVo9QVwQcvp5d0qyqMeJ3xFDvPwOuTk7G7TSR8sIOy2bE+
dTwMziZgRvCYecqV8gT/YbsR4JNg3kl1XjHPwFC1dk6A7kP9kV9edf7gRIsLWeNS
iyXSR/gAdWkeJf4ajRZX/pZr1XaaxWKpjaL5SQIDAQABAoIBAFmfi2HffApUsB5X
0RurKlxYsRhMx+r5H5th/LWJ4hjHDRICAo0KpVReW9oxNIJYqhakDfb5W7Xr60ON
LRqMCkTyzjs8lRulUJz8DXvEaaeuWbAl6xNS4dMAZushZE+DCCz9HvFYvsG3/znS
i1U3vH07AWevIR+K24z/F4Gv3hEXp3QWSHkdItuRwfVCK/qJjuk1p6GVi4qjrPGL
HOrmF0imxTb6L2eLxhSd6PaQAhoweKm1LuThSuyLPrnD3DmuMt/8mi/gPsRSbUCi
J/aPF3xkllD9dxZnRRt4Nhs53FneOQ/tfcKX9tRP8PTtn2NhkHsIblG5Ro/fcebI
yIyMgAECgYEAxMvTdAnYYzjdvuYCmdwYx2h5WlkL3iLHmShAE2otW2LWrRdFPOKv
4ZvvKxCNFKCVIBFRYWkkbS514gEshVoHYStTMNHNejeK/8Io9aqfR4irOM/yWrL+
yYJWZi41cqTDzBgfAuoxPf697P4mM5PPIVRv1Hr+C+tdamxeohmKNUkCgYEArdtM
DHRwnHS1fHayzoaoXN+UPo7/mG3/g7vOIIOWQwKjC80Ps2iSVuKCnkizsGuImETV
bt8fJpF2sIZ6nuS0nfDZCCheGBCSeIg4ZsQZCFk4wImhyxrehZ3zgEmOzqXkK0C0
FZBg/LFi3g59BnqZG2Y4b3aYlSwSs3f3VZhGpAECgYA0hoKFsisDMKZe0V1YW5px
fr0FFEdKntXPVyLjC6/XeGX8BP4B5i8zdD89q0k8fC/RQ04JRdrnGUN1cwLDBOh7
Uuj9WsIRIMoEwXnVOBkTKrMokrgI5UWD2zncQ/EYDEoGK1n7mS5Tca6Xlq3zjjv2
lWbTu5Aa9lMUmKAZe9+boQKBgQCLV032VYTEAM5MeR4KZOafuRopoZa9Zrv5qxYj
/RL7litzk+DXnCJdvKGPlxlddnI+CD0/5VgkI0YLaVzx6L/SLmzkGuZ/Rxj9vb/m
rZiallfkCOtBy8E5OkUlNs9cVJ0xBWTQO61gGhPxgY83GB+KVD07KMRWGsLKUIZN
dgR4AQKBgEB3N+1JStA0/3A5406YEGd0gCBsOHTBVCeqkAfk2IkAA8mJOgBkvd/t
VyD6YuLazBBwYnHUZ/wDIbWnOaeTM/sIwtTdWxSIEoE9ndENUvuhtA9rEKB5cjAU
DmwiTrnEoqa9LbfzFrDZg5cgrkRzjdTfrIW4dviSIQs+Q8yFJVpT
-----END RSA PRIVATE KEY-----`;

/**
 * Returns the PEM certificate for QZ Tray's setCertificatePromise.
 */
export function getQZCertificate(): string {
  return CERT_PEM;
}

/**
 * Signs data with the private key using SHA512 for QZ Tray's setSignaturePromise.
 */
export function signQZData(toSign: string): string {
  const privateKey = forge.pki.privateKeyFromPem(PRIVATE_KEY_PEM);
  const md = forge.md.sha512.create();
  md.update(toSign, 'utf8');
  const signature = privateKey.sign(md);
  return forge.util.encode64(signature);
}

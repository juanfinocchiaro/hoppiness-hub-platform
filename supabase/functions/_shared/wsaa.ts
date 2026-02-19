/**
 * WSAA + WSFE - ARCA/AFIP Integration
 * Pure asn1js + node:crypto implementation for Deno Edge Functions
 */
import { createSign } from "node:crypto";
import * as asn1js from "npm:asn1js@3.0.5";

const WSAA_URLS = {
  homologacion: "https://wsaahomo.afip.gov.ar/ws/services/LoginCms",
  produccion: "https://wsaa.afip.gov.ar/ws/services/LoginCms",
};

export const WSFE_URLS = {
  homologacion: "https://wswhomo.afip.gov.ar/wsfev1/service.asmx",
  produccion: "https://servicios1.afip.gov.ar/wsfev1/service.asmx",
};

export interface WSAACredentials { token: string; sign: string; }

function generateTRA(service: string): string {
  const now = new Date();
  const genTime = new Date(now.getTime() - 10 * 60 * 1000);
  const expTime = new Date(now.getTime() + 10 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "-03:00");
  return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${Math.floor(now.getTime() / 1000)}</uniqueId>
    <generationTime>${fmt(genTime)}</generationTime>
    <expirationTime>${fmt(expTime)}</expirationTime>
  </header>
  <service>${service}</service>
</loginTicketRequest>`;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function pemToBytes(pem: string): Uint8Array {
  const b64 = pem.split("\n").filter(l => !l.startsWith("-----") && l.trim().length > 0).join("");
  return base64ToBytes(b64);
}

/**
 * Build CMS SignedData (PKCS#7) structure using raw ASN.1
 * This is what ARCA WSAA LoginCMS expects
 */
function buildCMSSignedData(
  traBytes: Uint8Array,
  certDer: Uint8Array,
  signatureBytes: Uint8Array,
  certAsn1Result: asn1js.AsnType
): ArrayBuffer {
  // Parse cert to extract issuer and serialNumber
  const certSeq = certAsn1Result as asn1js.Sequence;
  const tbsCert = certSeq.valueBlock.value[0] as asn1js.Sequence;
  
  // TBS Certificate structure: version(optional), serialNumber, signature, issuer, ...
  const tbsValues = tbsCert.valueBlock.value;
  let idx = 0;
  // Check if first element is [0] EXPLICIT (version)
  if (tbsValues[idx].idBlock.tagClass === 3 && tbsValues[idx].idBlock.tagNumber === 0) {
    idx++; // skip version
  }
  const serialNumber = tbsValues[idx]; // serialNumber
  idx++; // skip signature algorithm
  idx++;
  const issuer = tbsValues[idx]; // issuer

  // SHA-256 OID
  const sha256Oid = new asn1js.Sequence({ value: [
    new asn1js.ObjectIdentifier({ value: "2.16.840.1.101.3.4.2.1" }),
    new asn1js.Null(),
  ]});

  // RSA OID  
  const rsaOid = new asn1js.Sequence({ value: [
    new asn1js.ObjectIdentifier({ value: "1.2.840.113549.1.1.1" }),
    new asn1js.Null(),
  ]});

  // IssuerAndSerialNumber
  const issuerAndSerial = new asn1js.Sequence({ value: [
    issuer,
    serialNumber,
  ]});

  // SignerInfo
  const signerInfo = new asn1js.Sequence({ value: [
    new asn1js.Integer({ value: 1 }), // version
    issuerAndSerial,
    sha256Oid, // digestAlgorithm
    rsaOid, // signatureAlgorithm
    new asn1js.OctetString({ valueHex: signatureBytes.buffer }),
  ]});

  // SignedData
  const signedData = new asn1js.Sequence({ value: [
    new asn1js.Integer({ value: 1 }), // version
    new asn1js.Set({ value: [sha256Oid] }), // digestAlgorithms
    new asn1js.Sequence({ value: [ // encapContentInfo
      new asn1js.ObjectIdentifier({ value: "1.2.840.113549.1.7.1" }),
      new asn1js.Constructed({
        idBlock: { tagClass: 3, tagNumber: 0 },
        value: [new asn1js.OctetString({ valueHex: traBytes.buffer })],
      }),
    ]}),
    new asn1js.Constructed({ // certificates [0] IMPLICIT
      idBlock: { tagClass: 3, tagNumber: 0 },
      value: [certAsn1Result],
    }),
    new asn1js.Set({ value: [signerInfo] }), // signerInfos
  ]});

  // ContentInfo
  const contentInfo = new asn1js.Sequence({ value: [
    new asn1js.ObjectIdentifier({ value: "1.2.840.113549.1.7.2" }),
    new asn1js.Constructed({
      idBlock: { tagClass: 3, tagNumber: 0 },
      value: [signedData],
    }),
  ]});

  return contentInfo.toBER(false);
}

async function signTRA(traXml: string, certPem: string, keyPem: string): Promise<string> {
  const traBytes = new TextEncoder().encode(traXml);
  const certDer = pemToBytes(certPem);
  
  // Parse cert ASN.1
  const certAsn1 = asn1js.fromBER(certDer.buffer);
  if (certAsn1.offset === -1) throw new Error("Error al parsear certificado DER");

  // Normalize key PEM
  let normalizedKey = keyPem.trim();
  if (!normalizedKey.includes("-----BEGIN")) {
    normalizedKey = `-----BEGIN RSA PRIVATE KEY-----\n${normalizedKey}\n-----END RSA PRIVATE KEY-----`;
  }

  // Sign with node:crypto
  const signer = createSign("SHA256");
  signer.update(traXml);
  const signature = signer.sign(normalizedKey);

  // Build CMS
  const cmsBytes = buildCMSSignedData(traBytes, certDer, new Uint8Array(signature), certAsn1.result);
  return btoa(String.fromCharCode(...new Uint8Array(cmsBytes)));
}

async function callWSAA(cmsBase64: string, esProduccion: boolean): Promise<WSAACredentials> {
  const url = esProduccion ? WSAA_URLS.produccion : WSAA_URLS.homologacion;
  const soap = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov">
  <soapenv:Header/>
  <soapenv:Body>
    <wsaa:loginCms>
      <wsaa:in0>${cmsBase64}</wsaa:in0>
    </wsaa:loginCms>
  </soapenv:Body>
</soapenv:Envelope>`;

  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: "" }, body: soap });
  if (!res.ok) throw new Error(`WSAA HTTP ${res.status}: ${(await res.text()).substring(0, 500)}`);

  const text = await res.text();
  const returnMatch = text.match(/<loginCmsReturn>([\s\S]*?)<\/loginCmsReturn>/);
  if (!returnMatch) throw new Error(`No loginCmsReturn: ${text.substring(0, 500)}`);

  const decoded = returnMatch[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  const token = decoded.match(/<token>([\s\S]*?)<\/token>/);
  const sign = decoded.match(/<sign>([\s\S]*?)<\/sign>/);
  if (!token || !sign) throw new Error(`No token/sign: ${decoded.substring(0, 500)}`);

  return { token: token[1].trim(), sign: sign[1].trim() };
}

export async function authenticateWSAA(certPem: string, keyPem: string, service: string, esProduccion: boolean): Promise<WSAACredentials> {
  const tra = generateTRA(service);
  console.log("TRA generado para servicio:", service);
  const cms = await signTRA(tra, certPem, keyPem);
  console.log("TRA firmado, CMS length:", cms.length);
  const creds = await callWSAA(cms, esProduccion);
  console.log("WSAA auth OK");
  return creds;
}

export async function callWSFE(method: string, body: string, esProduccion: boolean): Promise<string> {
  const url = esProduccion ? WSFE_URLS.produccion : WSFE_URLS.homologacion;
  const soap = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soap:Header/><soap:Body><ar:${method}>${body}</ar:${method}></soap:Body>
</soap:Envelope>`;

  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: `http://ar.gov.afip.dif.FEV1/${method}` }, body: soap });
  if (!res.ok) throw new Error(`WSFE HTTP ${res.status}: ${(await res.text()).substring(0, 500)}`);
  return await res.text();
}

export async function getLastVoucher(creds: WSAACredentials, cuit: string, pv: number, tipo: number, prod: boolean): Promise<number> {
  const body = `<ar:Auth><ar:Token>${creds.token}</ar:Token><ar:Sign>${creds.sign}</ar:Sign><ar:Cuit>${cuit.replace(/-/g, "")}</ar:Cuit></ar:Auth><ar:PtoVta>${pv}</ar:PtoVta><ar:CbteTipo>${tipo}</ar:CbteTipo>`;
  const resp = await callWSFE("FECompUltimoAutorizado", body, prod);
  const m = resp.match(/<CbteNro>(\d+)<\/CbteNro>/);
  if (!m) { const e = resp.match(/<Msg>([\s\S]*?)<\/Msg>/); if (e) throw new Error(`WSFE: ${e[1]}`); return 0; }
  return parseInt(m[1], 10);
}

export async function requestCAE(
  creds: WSAACredentials, cuit: string,
  r: { puntoVenta: number; cbteTipo: number; concepto: number; docTipo: number; docNro: number; cbteDesde: number; cbteHasta: number; cbteFch: string; impTotal: number; impTotConc: number; impNeto: number; impOpEx: number; impIVA: number; impTrib: number; monId: string; monCotiz: number; iva?: { id: number; baseImp: number; importe: number }[] },
  prod: boolean
): Promise<{ cae: string; caeVto: string; cbteDesde: number; cbteHasta: number; resultado: string; observaciones?: string }> {
  const c = cuit.replace(/-/g, "");
  const ivaXml = r.iva?.length ? `<ar:Iva>${r.iva.map(i => `<ar:AlicIva><ar:Id>${i.id}</ar:Id><ar:BaseImp>${i.baseImp.toFixed(2)}</ar:BaseImp><ar:Importe>${i.importe.toFixed(2)}</ar:Importe></ar:AlicIva>`).join("")}</ar:Iva>` : "";
  const body = `<ar:Auth><ar:Token>${creds.token}</ar:Token><ar:Sign>${creds.sign}</ar:Sign><ar:Cuit>${c}</ar:Cuit></ar:Auth>
    <ar:FeCAEReq><ar:FeCabReq><ar:CantReg>1</ar:CantReg><ar:PtoVta>${r.puntoVenta}</ar:PtoVta><ar:CbteTipo>${r.cbteTipo}</ar:CbteTipo></ar:FeCabReq>
    <ar:FeDetReq><ar:FECAEDetRequest><ar:Concepto>${r.concepto}</ar:Concepto><ar:DocTipo>${r.docTipo}</ar:DocTipo><ar:DocNro>${r.docNro}</ar:DocNro>
    <ar:CbteDesde>${r.cbteDesde}</ar:CbteDesde><ar:CbteHasta>${r.cbteHasta}</ar:CbteHasta><ar:CbteFch>${r.cbteFch}</ar:CbteFch>
    <ar:ImpTotal>${r.impTotal.toFixed(2)}</ar:ImpTotal><ar:ImpTotConc>${r.impTotConc.toFixed(2)}</ar:ImpTotConc><ar:ImpNeto>${r.impNeto.toFixed(2)}</ar:ImpNeto>
    <ar:ImpOpEx>${r.impOpEx.toFixed(2)}</ar:ImpOpEx><ar:ImpIVA>${r.impIVA.toFixed(2)}</ar:ImpIVA><ar:ImpTrib>${r.impTrib.toFixed(2)}</ar:ImpTrib>
    <ar:MonId>${r.monId}</ar:MonId><ar:MonCotiz>${r.monCotiz}</ar:MonCotiz>${ivaXml}
    </ar:FECAEDetRequest></ar:FeDetReq></ar:FeCAEReq>`;

  const resp = await callWSFE("FECAESolicitar", body, prod);
  const caeM = resp.match(/<CAE>(\d+)<\/CAE>/), vtoM = resp.match(/<CAEFchVto>(\d+)<\/CAEFchVto>/);
  const resM = resp.match(/<Resultado>(\w)<\/Resultado>/), errM = resp.match(/<Msg>([\s\S]*?)<\/Msg>/), obsM = resp.match(/<Obs>([\s\S]*?)<\/Obs>/);
  const resultado = resM?.[1] || "R";
  if (resultado === "R" && !caeM) throw new Error(`ARCA rechazó: ${errM?.[1] || obsM?.[1] || "Error desconocido"}`);
  if (!caeM || !vtoM) throw new Error(`Sin CAE: ${resp.substring(0, 1000)}`);
  const v = vtoM[1];
  return { cae: caeM[1], caeVto: `${v.substring(0,4)}-${v.substring(4,6)}-${v.substring(6,8)}`, cbteDesde: parseInt(resp.match(/<CbteDesde>(\d+)/)?.[1]||"0"), cbteHasta: parseInt(resp.match(/<CbteHasta>(\d+)/)?.[1]||"0"), resultado, observaciones: obsM?.[1] };
}

/**
 * WSAA + WSFE - ARCA/AFIP Integration
 * node-forge implementation for Deno Edge Functions
 */
import forge from "npm:node-forge@1.3.3";

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
  const fmt = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");
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

/**
 * Sign the TRA XML using PKCS#7 (CMS SignedData) with node-forge.
 * This is what ARCA WSAA LoginCMS expects.
 */
async function signTRA(traXml: string, certPem: string, keyPem: string): Promise<string> {
  // Normalize key PEM
  let normalizedKey = keyPem.trim();
  if (!normalizedKey.includes("-----BEGIN")) {
    normalizedKey = `-----BEGIN RSA PRIVATE KEY-----\n${normalizedKey}\n-----END RSA PRIVATE KEY-----`;
  }

  // Normalize cert PEM
  let normalizedCert = certPem.trim();
  if (!normalizedCert.includes("-----BEGIN")) {
    normalizedCert = `-----BEGIN CERTIFICATE-----\n${normalizedCert}\n-----END CERTIFICATE-----`;
  }

  // Parse key and cert with forge
  const privateKey = forge.pki.privateKeyFromPem(normalizedKey);
  const certificate = forge.pki.certificateFromPem(normalizedCert);

  // Create PKCS#7 signed data
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(traXml, "utf8");
  p7.addCertificate(certificate);
  p7.addSigner({
    key: privateKey,
    certificate: certificate,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [],
  });

  // Sign
  p7.sign({ detached: false });

  // Convert to DER then base64
  const asn1 = p7.toAsn1();
  const der = forge.asn1.toDer(asn1);
  return forge.util.encode64(der.getBytes());
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
  console.log("TRA firmado con node-forge, CMS length:", cms.length);
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

export interface CAERequestParams {
  puntoVenta: number; cbteTipo: number; concepto: number; docTipo: number; docNro: number;
  cbteDesde: number; cbteHasta: number; cbteFch: string;
  impTotal: number; impTotConc: number; impNeto: number; impOpEx: number; impIVA: number; impTrib: number;
  monId: string; monCotiz: number; condicionIVAReceptorId?: number;
  iva?: { id: number; baseImp: number; importe: number }[];
  cbtesAsoc?: { tipo: number; ptoVta: number; nro: number; cuit: string; cbteFch: string }[];
}

export interface CAEResult {
  cae: string; caeVto: string; cbteDesde: number; cbteHasta: number; resultado: string; observaciones?: string;
}

function buildCAEBody(creds: WSAACredentials, cuit: string, r: CAERequestParams): string {
  const c = cuit.replace(/-/g, "");
  const ivaXml = r.iva?.length ? `<ar:Iva>${r.iva.map(i => `<ar:AlicIva><ar:Id>${i.id}</ar:Id><ar:BaseImp>${i.baseImp.toFixed(2)}</ar:BaseImp><ar:Importe>${i.importe.toFixed(2)}</ar:Importe></ar:AlicIva>`).join("")}</ar:Iva>` : "";
  const condIvaXml = r.condicionIVAReceptorId ? `<ar:CondicionIVAReceptorId>${r.condicionIVAReceptorId}</ar:CondicionIVAReceptorId>` : "";
  const assocXml = r.cbtesAsoc?.length ? `<ar:CbtesAsoc>${r.cbtesAsoc.map(a => `<ar:CbteAsoc><ar:Tipo>${a.tipo}</ar:Tipo><ar:PtoVta>${a.ptoVta}</ar:PtoVta><ar:Nro>${a.nro}</ar:Nro><ar:Cuit>${a.cuit}</ar:Cuit><ar:CbteFch>${a.cbteFch}</ar:CbteFch></ar:CbteAsoc>`).join("")}</ar:CbtesAsoc>` : "";

  return `<ar:Auth><ar:Token>${creds.token}</ar:Token><ar:Sign>${creds.sign}</ar:Sign><ar:Cuit>${c}</ar:Cuit></ar:Auth>
    <ar:FeCAEReq><ar:FeCabReq><ar:CantReg>1</ar:CantReg><ar:PtoVta>${r.puntoVenta}</ar:PtoVta><ar:CbteTipo>${r.cbteTipo}</ar:CbteTipo></ar:FeCabReq>
    <ar:FeDetReq><ar:FECAEDetRequest><ar:Concepto>${r.concepto}</ar:Concepto><ar:DocTipo>${r.docTipo}</ar:DocTipo><ar:DocNro>${r.docNro}</ar:DocNro>
    <ar:CbteDesde>${r.cbteDesde}</ar:CbteDesde><ar:CbteHasta>${r.cbteHasta}</ar:CbteHasta><ar:CbteFch>${r.cbteFch}</ar:CbteFch>
    <ar:ImpTotal>${r.impTotal.toFixed(2)}</ar:ImpTotal><ar:ImpTotConc>${r.impTotConc.toFixed(2)}</ar:ImpTotConc><ar:ImpNeto>${r.impNeto.toFixed(2)}</ar:ImpNeto>
    <ar:ImpOpEx>${r.impOpEx.toFixed(2)}</ar:ImpOpEx><ar:ImpIVA>${r.impIVA.toFixed(2)}</ar:ImpIVA><ar:ImpTrib>${r.impTrib.toFixed(2)}</ar:ImpTrib>
    <ar:MonId>${r.monId}</ar:MonId><ar:MonCotiz>${r.monCotiz}</ar:MonCotiz>${condIvaXml}${assocXml}${ivaXml}
    </ar:FECAEDetRequest></ar:FeDetReq></ar:FeCAEReq>`;
}

function parseCAEResponse(resp: string): CAEResult {
  // Log raw ARCA response for diagnostics (first 3000 chars)
  console.log("ARCA raw response (first 3000):", resp.substring(0, 3000));

  const caeM = resp.match(/<CAE>(\d+)<\/CAE>/);
  const vtoM = resp.match(/<CAEFchVto>(\d+)<\/CAEFchVto>/);
  const resM = resp.match(/<Resultado>(\w)<\/Resultado>/);

  // Parse <Err> blocks (real errors from ARCA)
  const errMatches = [...resp.matchAll(/<Err>[\s\S]*?<Code>(\d+)<\/Code>[\s\S]*?<Msg>([\s\S]*?)<\/Msg>[\s\S]*?<\/Err>/g)];
  const errors = errMatches.map(m => `[${m[1]}] ${m[2].trim()}`);

  // Parse <Obs> blocks (observations/warnings per voucher)
  const obsMatches = [...resp.matchAll(/<Obs>[\s\S]*?<Code>(\d+)<\/Code>[\s\S]*?<Msg>([\s\S]*?)<\/Msg>[\s\S]*?<\/Obs>/g)];
  const observations = obsMatches.map(m => `[${m[1]}] ${m[2].trim()}`);

  // Parse <Events> blocks (informational events like RG 5616 warning)
  const evtMatches = [...resp.matchAll(/<Evt>[\s\S]*?<Code>(\d+)<\/Code>[\s\S]*?<Msg>([\s\S]*?)<\/Msg>[\s\S]*?<\/Evt>/g)];
  const events = evtMatches.map(m => `[${m[1]}] ${m[2].trim()}`);

  if (events.length > 0) console.log("ARCA Events (informational):", events.join(" | "));
  if (observations.length > 0) console.log("ARCA Observations:", observations.join(" | "));
  if (errors.length > 0) console.error("ARCA Errors:", errors.join(" | "));

  const resultado = resM?.[1] || "R";

  // Priority: Errors > Observations > Events
  if (resultado === "R" && !caeM) {
    const errorMsg = errors.length > 0
      ? errors.join("; ")
      : observations.length > 0
        ? observations.join("; ")
        : events.length > 0
          ? events.join("; ")
          : "Error desconocido";
    throw new Error(`ARCA rechazó: ${errorMsg}`);
  }

  if (!caeM || !vtoM) throw new Error(`Sin CAE en respuesta: ${resp.substring(0, 2000)}`);

  const v = vtoM[1];
  return {
    cae: caeM[1],
    caeVto: `${v.substring(0, 4)}-${v.substring(4, 6)}-${v.substring(6, 8)}`,
    cbteDesde: parseInt(resp.match(/<CbteDesde>(\d+)/)?.[1] || "0"),
    cbteHasta: parseInt(resp.match(/<CbteHasta>(\d+)/)?.[1] || "0"),
    resultado,
    observaciones: observations.length > 0 ? observations.join("; ") : undefined,
  };
}

export async function requestCAE(
  creds: WSAACredentials, cuit: string, r: CAERequestParams, prod: boolean
): Promise<CAEResult> {
  const body = buildCAEBody(creds, cuit, r);
  const resp = await callWSFE("FECAESolicitar", body, prod);
  return parseCAEResponse(resp);
}

/** Same as requestCAE but explicitly named for credit notes with CbtesAsoc */
export async function requestCAEWithAssoc(
  creds: WSAACredentials, cuit: string, r: CAERequestParams, prod: boolean
): Promise<CAEResult> {
  return requestCAE(creds, cuit, r, prod);
}

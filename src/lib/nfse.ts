// Emissão de NFS-e, autenticada por mTLS com o certificado digital A1
// (e-CNPJ) da empresa emitente.
//
// Empresa emitente: PRIMEA GESTÃO DE SERVIÇOS LTDA, CNPJ 64.531.214/0001-77,
// Simples Nacional (ME/EPP), Brasília-DF, Inscrição Municipal 0846247900116
// — não confundir com o CNPJ da pousada, que é outro, separado (ver memória
// "maytra-pousada-cnpj-separado").
//
// Existem DOIS canais possíveis pra emitir, e usamos o do DF por padrão
// porque é o único que funciona de verdade hoje (ver "canal" abaixo):
//
// canal "df" (padrão, NFSE_CANAL=df) — webservice PRÓPRIO do Distrito
//   Federal (plataforma ISSNet/NotaControl, mesma usada por várias
//   prefeituras — não é temporário, é a decisão estrutural do DF, que
//   optou por manter sistema próprio em vez de aderir ao emissor gratuito
//   nacional). SOAP (Document/Literal), método GerarNfse, WSDL real
//   confirmado em 02/09/2026:
//     Homologação: https://nfse.issnetonline.com.br/wsnfsenacional/homologacao/nfse.asmx
//     Produção:    https://nfse.fazenda.df.gov.br/wsnfsenacional/nfse.asmx
//   A DPS aqui PRECISA vir com a Inscrição Municipal do prestador e
//   assinada digitalmente (XML-DSig: C14N + enveloped-signature, SHA-1,
//   RSA-SHA1 — perfil clássico de nota fiscal eletrônica brasileira,
//   via biblioteca `xml-crypto`), além do mTLS na conexão.
//
// canal "nacional" (NFSE_CANAL=nacional) — webservice GRATUITO do Sistema
//   Nacional NFS-e (ADN/SEFIN, nfse.gov.br), JSON simples + mTLS, sem
//   assinatura XML. Testado e funcional tecnicamente, mas confirmado via
//   API do próprio governo (GET .../parametrizacao/5300108/convenio) que
//   Brasília/DF NÃO aderiu a esse canal (aderenteEmissorNacional: 0) —
//   fica aqui pronto e dormente pro caso do DF mudar de política no
//   futuro, mas não é o caminho usado hoje.
//
// Certificado: NFSE_CERTIFICADO_BASE64 (base64 do .pfx) + NFSE_CERTIFICADO_
// SENHA, extraído em memória com node-forge (puro JS) porque o OpenSSL 3
// embutido no Node/Vercel não carrega esse PFX específico — a Certisign
// ainda gera PKCS12 com cifras antigas (RC2-40/3DES) que o provider padrão
// do OpenSSL 3 rejeita ("Unsupported PKCS12 PFX data"). node-forge não
// depende do OpenSSL do sistema, então funciona igual local e na Vercel.
//
// Ambiente: por padrão SEMPRE homologação, onde devemos testar à vontade
// sem efeito fiscal real. Só muda pra produção de verdade definindo
// NFSE_AMBIENTE=producao — troca essa só deve ser feita depois de validar
// exaustivamente em homologação, porque aí sim a nota emitida é real e
// vale fiscalmente.
//
// Código de tributação nacional usado: 100901 (item 10.09 da lista da LC
// 116/2003 — "Representação de qualquer natureza, inclusive comercial").
// Confirmado em 02/09/2026 consultando o cadastro real da Primea na
// Receita do DF (ConsultarDadosCadastrais): as atividades cadastradas são
// todas de intermediação/agenciamento (item 10.x), não de reparo de
// veículos (14.01) — reflete o modelo real do negócio: a Primea/BSB
// Garage intermedia entre o cliente e as oficinas terceirizadas, não
// executa o reparo ela mesma. Entre as opções cadastradas (10.02, 10.04,
// 10.05, 10.08, 10.09, 10.10), o usuário confirmou 10.09 como a que
// melhor descreve o serviço. Alíquota real cadastrada pra essa atividade:
// 2,00% (cTribMun 1009).
// Código do município (IBGE) de Brasília-DF: 5300108.

import { gzipSync, gunzipSync } from "node:zlib";
import https from "node:https";
import forge from "node-forge";
import { SignedXml } from "xml-crypto";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import xpath from "xpath";
import { codigoMunicipioIBGE } from "@/lib/ibge";

const PRESTADOR_CNPJ = "64531214000177";
const PRESTADOR_NOME = "PRIMEA GESTAO DE SERVICOS LTDA";
const PRESTADOR_IM_DF = "0846247900116"; // Inscrição Municipal no DF, só usada no canal "df"
const COD_MUNICIPIO = "5300108"; // Brasília - DF (IBGE)
const C_TRIB_NAC = "100901"; // LC 116, item 10.09 — representação comercial (intermediação)
const C_TRIB_MUN_DF = "1009"; // código municipal correspondente no cadastro real da Primea no DF
const ALIQUOTA_ISS_DF = "2.00"; // alíquota real cadastrada pra essa atividade
// Códigos do grupo IBSCBS (reforma tributária, obrigatório na prática pelo
// webservice do DF a partir da DPS 1.01) pra esse cTribNac, tirados da
// tabela oficial de correlação da Nota Control
// (Correlacao_TribNac_NBS_cClassTribIBSCBS_CSTIBSCBS_IndOp.xlsx): cNBS
// 102010000, CST 000, cClassTrib 000001, cIndOp 100301 ("Demais serviços,
// em operações onerosas").
const C_NBS = "102010000";
const IBSCBS_CST = "000";
const IBSCBS_CLASS_TRIB = "000001";
const IBSCBS_IND_OP = "100301";

const TP_AMB = { homologacao: 2, producao: 1 } as const;
type Ambiente = keyof typeof TP_AMB;

const URLS_NACIONAL: Record<Ambiente, string> = {
  homologacao: "https://sefin.producaorestrita.nfse.gov.br/SefinNacional",
  producao: "https://sefin.nfse.gov.br/SefinNacional",
};

const URLS_DF: Record<Ambiente, string> = {
  homologacao: "https://nfse.issnetonline.com.br/wsnfsenacional/homologacao/nfse.asmx",
  producao: "https://nfse.fazenda.df.gov.br/wsnfsenacional/nfse.asmx",
};

type Canal = "df" | "nacional";

function canalAtual(): Canal {
  return process.env.NFSE_CANAL === "nacional" ? "nacional" : "df";
}

function ambienteAtual(): Ambiente {
  return process.env.NFSE_AMBIENTE === "producao" ? "producao" : "homologacao";
}

export function nfseConfigurada(): boolean {
  return Boolean(process.env.NFSE_CERTIFICADO_BASE64 && process.env.NFSE_CERTIFICADO_SENHA);
}

// ---------- Certificado (PKCS12 -> chave/cert PEM, via node-forge) ----------

let credenciaisCache: { key: string; cert: string } | null = null;

function carregarCredenciais(): { key: string; cert: string } {
  if (credenciaisCache) return credenciaisCache;

  const base64 = process.env.NFSE_CERTIFICADO_BASE64;
  const senha = process.env.NFSE_CERTIFICADO_SENHA;
  if (!base64 || !senha) {
    throw new Error("NFSE_CERTIFICADO_BASE64 / NFSE_CERTIFICADO_SENHA não configurados.");
  }

  const pfxDer = forge.util.decode64(base64);
  const asn1 = forge.asn1.fromDer(pfxDer);
  const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, senha);

  let certPem: string | null = null;
  let keyPem: string | null = null;

  for (const safeContents of p12.safeContents) {
    for (const safeBag of safeContents.safeBags) {
      if (safeBag.type === forge.pki.oids.certBag && safeBag.cert) {
        certPem = forge.pki.certificateToPem(safeBag.cert);
      } else if (
        (safeBag.type === forge.pki.oids.pkcs8ShroudedKeyBag || safeBag.type === forge.pki.oids.keyBag) &&
        safeBag.key
      ) {
        keyPem = forge.pki.privateKeyToPem(safeBag.key);
      }
    }
  }

  if (!certPem || !keyPem) {
    throw new Error("Não foi possível extrair certificado/chave do PKCS12 (NFSE_CERTIFICADO_BASE64).");
  }

  credenciaisCache = { key: keyPem, cert: certPem };
  return credenciaisCache;
}

// ---------- Montagem do XML da DPS ----------

function escapeXml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function somenteDigitos(texto: string): string {
  return texto.replace(/\D/g, "");
}

/**
 * Id da DPS = "DPS" + cMun(7) + tpInsc(1: 1-CPF 2-CNPJ) + inscrição(14,
 * zero-padded) + série(5, zero-padded) + número(15, zero-padded).
 * Formato confirmado a partir de um DPS real do ambiente de homologação.
 */
function gerarIdDps(codMunicipio: string, serie: string, numero: number): string {
  const tpInsc = "2"; // CNPJ
  const inscricao = PRESTADOR_CNPJ.padStart(14, "0");
  const serieFmt = serie.padStart(5, "0").slice(-5);
  const numeroFmt = String(numero).padStart(15, "0");
  return `DPS${codMunicipio}${tpInsc}${inscricao}${serieFmt}${numeroFmt}`;
}

/**
 * Código do município usado em cLocEmi/Id da DPS. No canal "df", o
 * ambiente de homologação do provedor (ISSNet/NotaControl) é compartilhado
 * entre todos os municípios atendidos por ele e só reconhece o código de
 * Campo Grande-MS (5002704) nesse ambiente de teste — confirmado por
 * relatos de outros integradores enfrentando exatamente esse webservice
 * (fórum ACBr, abril/2026). Em produção (e sempre no canal "nacional",
 * que valida o município de verdade) usamos o código real de Brasília-DF.
 */
function codMunicipioEmissao(canal: Canal, ambiente: Ambiente): string {
  if (canal === "df" && ambiente === "homologacao") return "5002704";
  return COD_MUNICIPIO;
}

function dataHoraEmissao(): string {
  // Brasília não observa horário de verão atualmente -> offset fixo -03:00.
  const agora = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const utc = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
  return (
    `${utc.getUTCFullYear()}-${pad(utc.getUTCMonth() + 1)}-${pad(utc.getUTCDate())}` +
    `T${pad(utc.getUTCHours())}:${pad(utc.getUTCMinutes())}:${pad(utc.getUTCSeconds())}-03:00`
  );
}

export type DadosEmissaoNFSe = {
  serie: string;
  numero: number;
  valor: number;
  descricaoServico: string;
  tomador: {
    cpf?: string | null;
    nome: string;
    // Obrigatório no canal "df" (cIndOp 100301 exige endereço do tomador
    // conforme o schema) — não usado no canal "nacional".
    endereco?: {
      logradouro: string;
      numero: string;
      bairro: string;
      cep: string;
      cidade: string;
      uf: string;
    } | null;
  };
};

/**
 * Monta a DPS. Canal "nacional" usa versão 1.00 (sem o grupo IBS/CBS —
 * testado e aceito assim pelo governo). Canal "df" usa versão 1.01 com o
 * grupo IBSCBS: mesmo sendo opcional no XSD publicado, o webservice do
 * DF/ISSNet rejeita sem ele na prática (mesma discrepância entre schema
 * publicado e validação real já documentada por outros integradores no
 * fórum ACBr pra esse provedor) — confirmado comparando com um XML real
 * autorizado em homologação. `incluirIM` inclui a Inscrição Municipal do
 * prestador no DF — obrigatória no canal "df", ausente no "nacional".
 */
async function montarXmlDps(
  dados: DadosEmissaoNFSe,
  ambiente: Ambiente,
  opts: { incluirIM: boolean; canal: Canal }
): Promise<{ xml: string; id: string }> {
  const tpAmb = TP_AMB[ambiente];
  const codMunicipio = codMunicipioEmissao(opts.canal, ambiente);
  const id = gerarIdDps(codMunicipio, dados.serie, dados.numero);
  const dataCompetencia = new Date().toISOString().slice(0, 10);
  const versao = opts.canal === "df" ? "1.01" : "1.00";

  const cpfTomador = dados.tomador.cpf ? somenteDigitos(dados.tomador.cpf) : "";

  // O webservice do DF exige CPF e endereço do tomador pro nosso cIndOp
  // (100301 está entre os códigos que disparam essa exigência no schema).
  // Nunca inventar esses dados — se faltar, é melhor bloquear a emissão
  // com um erro claro do que mandar dado falso num documento fiscal real.
  if (opts.canal === "df" && cpfTomador.length !== 11) {
    throw new Error(
      "CPF do cliente é obrigatório pra emitir NFS-e pelo webservice do DF. Cadastre o CPF do cliente antes de emitir."
    );
  }
  let blocoEndereco = "";
  if (opts.canal === "df") {
    const end = dados.tomador.endereco;
    if (!end) {
      throw new Error(
        "Endereço do cliente é obrigatório pra emitir NFS-e pelo webservice do DF. Cadastre o endereço completo do cliente antes de emitir."
      );
    }
    const cepDigitos = somenteDigitos(end.cep);
    const cMunTomador = await codigoMunicipioIBGE(end.cidade, end.uf);
    blocoEndereco =
      `<end><endNac><cMun>${cMunTomador}</cMun><CEP>${cepDigitos}</CEP></endNac>` +
      `<xLgr>${escapeXml(end.logradouro)}</xLgr><nro>${escapeXml(end.numero)}</nro>` +
      `<xBairro>${escapeXml(end.bairro)}</xBairro></end>`;
  }
  const blocoTomador =
    cpfTomador.length === 11
      ? `<CPF>${cpfTomador}</CPF><xNome>${escapeXml(dados.tomador.nome)}</xNome>${blocoEndereco}`
      : `<xNome>${escapeXml(dados.tomador.nome)}</xNome>${blocoEndereco}`;

  const descricao = escapeXml(dados.descricaoServico.slice(0, 2000) || "Serviços automotivos");
  const valor = dados.valor.toFixed(2);
  const blocoIM = opts.incluirIM ? `<IM>${PRESTADOR_IM_DF}</IM>` : "";

  // Grupo IBSCBS (reforma tributária) — obrigatório na prática pro canal
  // "df" a partir da versão 1.01. finNFSe=0 (NFS-e regular), indDest=1
  // (consumidor final), cIndOp conforme tabela de correlação oficial.
  const blocoIBSCBS =
    opts.canal === "df"
      ? `<IBSCBS><finNFSe>0</finNFSe><cIndOp>${IBSCBS_IND_OP}</cIndOp><indDest>1</indDest>` +
        `<valores><trib><gIBSCBS><CST>${IBSCBS_CST}</CST><cClassTrib>${IBSCBS_CLASS_TRIB}</cClassTrib></gIBSCBS></trib></valores>` +
        `</IBSCBS>`
      : "";
  const cNBS = opts.canal === "df" ? `<cNBS>${C_NBS}</cNBS>` : "";
  const cTribMun = opts.canal === "df" ? `<cTribMun>${C_TRIB_MUN_DF}</cTribMun>` : "";
  const pAliq = opts.canal === "df" ? `<pAliq>${ALIQUOTA_ISS_DF}</pAliq>` : "";

  const xml =
    `<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="${versao}">` +
    `<infDPS Id="${id}">` +
    `<tpAmb>${tpAmb}</tpAmb>` +
    `<dhEmi>${dataHoraEmissao()}</dhEmi>` +
    `<verAplic>BSBGarage_1.0</verAplic>` +
    `<serie>${escapeXml(dados.serie)}</serie>` +
    `<nDPS>${dados.numero}</nDPS>` +
    `<dCompet>${dataCompetencia}</dCompet>` +
    `<tpEmit>1</tpEmit>` +
    `<cLocEmi>${codMunicipio}</cLocEmi>` +
    `<prest>` +
    `<CNPJ>${PRESTADOR_CNPJ}</CNPJ>` +
    `${blocoIM}` +
    `<xNome>${escapeXml(PRESTADOR_NOME)}</xNome>` +
    `<regTrib>` +
    `<opSimpNac>3</opSimpNac>` +
    `<regApTribSN>1</regApTribSN>` +
    `<regEspTrib>0</regEspTrib>` +
    `</regTrib>` +
    `</prest>` +
    `<toma>${blocoTomador}</toma>` +
    `<serv>` +
    `<locPrest><cLocPrestacao>${COD_MUNICIPIO}</cLocPrestacao></locPrest>` +
    `<cServ><cTribNac>${C_TRIB_NAC}</cTribNac>${cTribMun}<xDescServ>${descricao}</xDescServ>${cNBS}</cServ>` +
    `</serv>` +
    `<valores>` +
    `<vServPrest><vServ>${valor}</vServ></vServPrest>` +
    `<trib>` +
    `<tribMun><tribISSQN>1</tribISSQN><tpRetISSQN>1</tpRetISSQN>${pAliq}</tribMun>` +
    `<tribFed><piscofins><CST>08</CST></piscofins></tribFed>` +
    `<totTrib>${opts.canal === "df" ? "<pTotTribSN>0.00</pTotTribSN>" : "<indTotTrib>0</indTotTrib>"}</totTrib>` +
    `</trib>` +
    `</valores>` +
    `${blocoIBSCBS}` +
    `</infDPS>` +
    `</DPS>`;

  return { xml, id };
}

/**
 * Assina a DPS com XML-DSig no perfil clássico de nota fiscal eletrônica
 * brasileira: C14N (sem comentários) + enveloped-signature, digest SHA-1,
 * assinatura RSA-SHA1 — exigido pelo webservice próprio do DF (o canal
 * nacional gratuito não exige assinatura, só mTLS).
 */
function assinarDps(dpsXml: string, id: string, key: string, cert: string): string {
  const sig = new SignedXml({
    privateKey: key,
    publicCert: cert,
    signatureAlgorithm: "http://www.w3.org/2000/09/xmldsig#rsa-sha1",
    canonicalizationAlgorithm: "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
  });
  sig.addReference({
    xpath: `//*[@Id='${id}']`,
    transforms: [
      "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
      "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
    ],
    digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1",
  });
  sig.computeSignature(dpsXml);
  return sig.getSignedXml();
}

// ---------- Canal nacional (ADN/SEFIN) — JSON + mTLS, sem assinatura ----------

type RespostaSucessoNacional = {
  chaveAcesso: string;
  nfseXmlGZipB64: string;
};

type RespostaErroNacional = {
  erros?: { codigo: string; descricao: string }[];
};

function postJson(url: string, body: string, key: string, cert: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const { hostname, pathname, search } = new URL(url);
    const agent = new https.Agent({ key, cert });
    const req = https.request(
      {
        hostname,
        path: pathname + search,
        method: "POST",
        agent,
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
        timeout: 30000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body: data }));
      }
    );
    req.on("timeout", () => req.destroy(new Error("Timeout na conexão com o webservice da NFS-e.")));
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function emitirViaNacional(
  dados: DadosEmissaoNFSe,
  ambiente: Ambiente,
  key: string,
  cert: string
): Promise<ResultadoEmissaoNFSe> {
  const { xml } = await montarXmlDps(dados, ambiente, { incluirIM: false, canal: "nacional" });
  const dpsXmlGZipB64 = gzipSync(Buffer.from(xml, "utf8")).toString("base64");
  const url = `${URLS_NACIONAL[ambiente]}/nfse`;

  const { status, body } = await postJson(url, JSON.stringify({ dpsXmlGZipB64 }), key, cert);

  if (status === 201) {
    const resposta = JSON.parse(body) as RespostaSucessoNacional;
    const nfseXml = gunzipSync(Buffer.from(resposta.nfseXmlGZipB64, "base64")).toString("utf8");
    return { chaveAcesso: resposta.chaveAcesso, xml: nfseXml, ambiente, canal: "nacional" };
  }

  let mensagem = `Falha ao emitir NFS-e pelo canal nacional (HTTP ${status}).`;
  try {
    const erro = JSON.parse(body) as RespostaErroNacional;
    if (erro.erros?.length) {
      mensagem = erro.erros.map((e) => `${e.codigo}: ${e.descricao}`).join(" | ");
    }
  } catch {
    // corpo não veio em JSON — mantém a mensagem genérica com o status HTTP.
  }
  throw new Error(mensagem);
}

// ---------- Canal DF — SOAP + XML-DSig ----------

const SOAP_NS = "http://www.sped.fazenda.gov.br/nfse";

function postSoap(
  url: string,
  envelope: string,
  soapAction: string,
  key: string,
  cert: string
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const { hostname, pathname, search } = new URL(url);
    const agent = new https.Agent({ key, cert });
    const req = https.request(
      {
        hostname,
        path: pathname + search,
        method: "POST",
        agent,
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          "Content-Length": Buffer.byteLength(envelope),
          SOAPAction: soapAction,
        },
        timeout: 30000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body: data }));
      }
    );
    req.on("timeout", () => req.destroy(new Error("Timeout na conexão com o webservice do DF.")));
    req.on("error", reject);
    req.write(envelope);
    req.end();
  });
}

function textoDoNo(doc: Document, caminho: string): string | null {
  const no = xpath.select1(caminho, doc) as Node | undefined;
  return no?.textContent?.trim() || null;
}

async function emitirViaDF(
  dados: DadosEmissaoNFSe,
  ambiente: Ambiente,
  key: string,
  cert: string
): Promise<ResultadoEmissaoNFSe> {
  const { xml, id } = await montarXmlDps(dados, ambiente, { incluirIM: true, canal: "df" });
  const dpsAssinado = assinarDps(xml, id, key, cert);

  // Formato do envelope confirmado contra um XML real autorizado em
  // homologação (não é suposição): nfseCabecMsg/nfseDadosMsg levam o XML
  // embutido CRU (sem escapar entidades nem usar CDATA, apesar do WSDL
  // tipar como xsd:string), o envelope declara o prefixo "nfse:" na raiz
  // em vez de xmlns solto no elemento da operação, e inclui um
  // <soapenv:Header/> vazio explícito.
  const cabecMsg = `<cabecalho versao="1.00" xmlns="${SOAP_NS}"><versaoDados>1.00</versaoDados></cabecalho>`;
  const dadosMsg = `<GerarNfseEnvio xmlns="${SOAP_NS}">${dpsAssinado}</GerarNfseEnvio>`;

  const envelope =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:nfse="${SOAP_NS}">` +
    `<soapenv:Header/>` +
    `<soapenv:Body>` +
    `<nfse:GerarNfse>` +
    `<nfseCabecMsg>${cabecMsg}</nfseCabecMsg>` +
    `<nfseDadosMsg>${dadosMsg}</nfseDadosMsg>` +
    `</nfse:GerarNfse>` +
    `</soapenv:Body>` +
    `</soapenv:Envelope>`;

  const url = URLS_DF[ambiente];
  const soapAction = `"${SOAP_NS}/GerarNfse"`;
  if (process.env.NFSE_DEBUG) {
    console.error("[nfse][df] envelope enviado:\n", envelope);
    const fs = await import("node:fs");
    fs.writeFileSync(process.env.NFSE_DEBUG_DPS_FILE ?? "debug-dps.xml", dpsAssinado);
  }
  const { status, body } = await postSoap(url, envelope, soapAction, key, cert);
  if (process.env.NFSE_DEBUG) console.error("[nfse][df] resposta bruta:\n", body);

  if (status !== 200) {
    throw new Error(`Falha ao emitir NFS-e pelo webservice do DF (HTTP ${status}). Resposta: ${body.slice(0, 500)}`);
  }

  const parser = new DOMParser();
  const respostaDoc = parser.parseFromString(body, "text/xml") as unknown as Document;

  const codigoErro = textoDoNo(respostaDoc, "//*[local-name(.)='MensagemRetorno']/*[local-name(.)='Codigo']");
  if (codigoErro) {
    const mensagemErro =
      textoDoNo(respostaDoc, "//*[local-name(.)='MensagemRetorno']/*[local-name(.)='Mensagem']") ?? "";
    const correcao = textoDoNo(respostaDoc, "//*[local-name(.)='MensagemRetorno']/*[local-name(.)='Correcao']");
    throw new Error(`${codigoErro}: ${mensagemErro}${correcao ? ` (${correcao})` : ""}`);
  }

  // A NFS-e vem embutida dentro de CompNfse/NFSe — guardamos o XML inteiro
  // e a chave de acesso é o atributo Id do infNFSe (prefixo "NFS...").
  const nfseNode = xpath.select1("//*[local-name(.)='NFSe']", respostaDoc) as Node | undefined;
  if (!nfseNode) {
    throw new Error(`NFS-e não encontrada na resposta do DF: ${body.slice(0, 500)}`);
  }
  const nfseXml = new XMLSerializer().serializeToString(nfseNode as unknown as Parameters<XMLSerializer["serializeToString"]>[0]);
  const chaveAcesso =
    textoDoNo(respostaDoc, "//*[local-name(.)='infNFSe']/*[local-name(.)='chNFSe']") ??
    (xpath.select1("//*[local-name(.)='infNFSe']/@Id", respostaDoc) as Attr | undefined)?.value ??
    "desconhecida";

  return { chaveAcesso, xml: nfseXml, ambiente, canal: "df" };
}

// ---------- Ponto de entrada único ----------

export type ResultadoEmissaoNFSe = {
  chaveAcesso: string;
  xml: string;
  ambiente: Ambiente;
  canal: Canal;
};

/**
 * Envia a DPS e emite a NFS-e de forma síncrona, pelo canal configurado
 * (canalAtual() — "df" por padrão). Lança erro com a mensagem do próprio
 * governo/DF (código + descrição) quando a emissão é rejeitada.
 */
export async function emitirNFSe(dados: DadosEmissaoNFSe): Promise<ResultadoEmissaoNFSe> {
  if (!nfseConfigurada()) {
    throw new Error("Emissão de NFS-e ainda não configurada (certificado digital ausente).");
  }

  const ambiente = ambienteAtual();
  const { key, cert } = carregarCredenciais();

  return canalAtual() === "nacional"
    ? emitirViaNacional(dados, ambiente, key, cert)
    : emitirViaDF(dados, ambiente, key, cert);
}

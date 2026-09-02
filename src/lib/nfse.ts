// Emissão de NFS-e via API do Sistema Nacional NFS-e (ADN/SEFIN Nacional —
// nfse.gov.br), autenticada por mTLS com o certificado digital A1 (e-CNPJ)
// da empresa emitente.
//
// Empresa emitente: PRIMEA GESTÃO DE SERVIÇOS LTDA, CNPJ 64.531.214/0001-77,
// Simples Nacional (ME/EPP), Brasília-DF — não confundir com o CNPJ da
// pousada, que é outro, separado (ver memória "maytra-pousada-cnpj-separado").
//
// Como funciona (verificado em 02/09/2026 contra a API real de Produção
// Restrita — não é uma suposição):
//   1. O certificado (.pfx) fica em NFSE_CERTIFICADO_BASE64 (base64 do
//      arquivo binário) + NFSE_CERTIFICADO_SENHA. É extraído em memória com
//      node-forge (puro JS) porque o OpenSSL 3 embutido no Node/Vercel não
//      carrega esse PFX específico — a Certisign ainda gera PKCS12 com
//      cifras antigas (RC2-40/3DES) que o provider padrão do OpenSSL 3
//      rejeita ("Unsupported PKCS12 PFX data"). node-forge não depende do
//      OpenSSL do sistema, então funciona igual local e na Vercel.
//   2. Montamos o XML da DPS (Declaração de Prestação de Serviço), GZIP +
//      base64, e enviamos em POST {dpsXmlGZipB64} pra
//      https://sefin.producaorestrita.nfse.gov.br/SefinNacional/nfse
//      (homologação) autenticado só pelo certificado cliente na conexão
//      HTTPS — não tem token/API key separado.
//   3. Resposta 201 síncrona já traz a NFS-e pronta: chaveAcesso e o XML da
//      nota (nfseXmlGZipB64, também GZIP+base64).
//
// Ambiente: por padrão SEMPRE homologação (Produção Restrita), que é onde
// devemos testar à vontade sem efeito fiscal real. Só muda pra produção de
// verdade (sefin.nfse.gov.br) definindo NFSE_AMBIENTE=producao — troca essa
// só deve ser feita depois de validar exaustivamente em homologação, porque
// aí sim a nota emitida é real e vale fiscalmente.
//
// Código de tributação nacional usado: 140101 (item 14.01 da lista da LC
// 116/2003 — lubrificação, limpeza, revisão, recondicionamento e reparo de
// veículos), que é exatamente o enquadramento dos serviços de martelinho de
// ouro / funilaria / pintura vendidos pela oficina, terceirizados ou não.
// Código do município (IBGE) de Brasília-DF: 5300108.

import { gzipSync, gunzipSync } from "node:zlib";
import https from "node:https";
import forge from "node-forge";

const PRESTADOR_CNPJ = "64531214000177";
const PRESTADOR_NOME = "PRIMEA GESTAO DE SERVICOS LTDA";
const COD_MUNICIPIO = "5300108"; // Brasília - DF (IBGE)
const C_TRIB_NAC = "140101"; // LC 116, item 14.01 — reparo/manutenção de veículos

const AMBIENTES = {
  homologacao: {
    tpAmb: 2,
    baseUrl: "https://sefin.producaorestrita.nfse.gov.br/SefinNacional",
  },
  producao: {
    tpAmb: 1,
    baseUrl: "https://sefin.nfse.gov.br/SefinNacional",
  },
} as const;

type Ambiente = keyof typeof AMBIENTES;

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
function gerarIdDps(serie: string, numero: number): string {
  const tpInsc = "2"; // CNPJ
  const inscricao = PRESTADOR_CNPJ.padStart(14, "0");
  const serieFmt = serie.padStart(5, "0").slice(-5);
  const numeroFmt = String(numero).padStart(15, "0");
  return `DPS${COD_MUNICIPIO}${tpInsc}${inscricao}${serieFmt}${numeroFmt}`;
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
  };
};

function montarXmlDps(dados: DadosEmissaoNFSe, ambiente: Ambiente): { xml: string; id: string } {
  const { tpAmb } = AMBIENTES[ambiente];
  const id = gerarIdDps(dados.serie, dados.numero);
  const dataCompetencia = new Date().toISOString().slice(0, 10);

  const cpfTomador = dados.tomador.cpf ? somenteDigitos(dados.tomador.cpf) : "";
  const blocoTomador =
    cpfTomador.length === 11
      ? `<CPF>${cpfTomador}</CPF><xNome>${escapeXml(dados.tomador.nome)}</xNome>`
      : `<xNome>${escapeXml(dados.tomador.nome)}</xNome>`;

  const descricao = escapeXml(dados.descricaoServico.slice(0, 2000) || "Serviços automotivos");
  const valor = dados.valor.toFixed(2);

  const xml =
    `<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">` +
    `<infDPS Id="${id}">` +
    `<tpAmb>${tpAmb}</tpAmb>` +
    `<dhEmi>${dataHoraEmissao()}</dhEmi>` +
    `<verAplic>BSBGarage_1.0</verAplic>` +
    `<serie>${escapeXml(dados.serie)}</serie>` +
    `<nDPS>${dados.numero}</nDPS>` +
    `<dCompet>${dataCompetencia}</dCompet>` +
    `<tpEmit>1</tpEmit>` +
    `<cLocEmi>${COD_MUNICIPIO}</cLocEmi>` +
    `<prest>` +
    `<CNPJ>${PRESTADOR_CNPJ}</CNPJ>` +
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
    `<cServ><cTribNac>${C_TRIB_NAC}</cTribNac><xDescServ>${descricao}</xDescServ></cServ>` +
    `</serv>` +
    `<valores>` +
    `<vServPrest><vServ>${valor}</vServ></vServPrest>` +
    `<trib>` +
    `<tribMun><tribISSQN>1</tribISSQN><tpRetISSQN>1</tpRetISSQN></tribMun>` +
    `<tribFed><piscofins><CST>08</CST></piscofins></tribFed>` +
    `<totTrib><indTotTrib>0</indTotTrib></totTrib>` +
    `</trib>` +
    `</valores>` +
    `</infDPS>` +
    `</DPS>`;

  return { xml, id };
}

// ---------- Envio HTTP (mTLS) ----------

type RespostaSucesso = {
  tipoAmbiente: number;
  dataHoraProcessamento: string;
  idDps: string;
  chaveAcesso: string;
  nfseXmlGZipB64: string;
};

type RespostaErro = {
  tipoAmbiente: number;
  dataHoraProcessamento: string;
  erros?: { codigo: string; descricao: string; complemento?: string }[];
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
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
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

export type ResultadoEmissaoNFSe = {
  chaveAcesso: string;
  xml: string;
  ambiente: Ambiente;
};

/**
 * Envia a DPS e emite a NFS-e de forma síncrona. Lança erro com a mensagem
 * do próprio governo (código + descrição) quando a emissão é rejeitada.
 */
export async function emitirNFSe(dados: DadosEmissaoNFSe): Promise<ResultadoEmissaoNFSe> {
  if (!nfseConfigurada()) {
    throw new Error("Emissão de NFS-e ainda não configurada (certificado digital ausente).");
  }

  const ambiente = ambienteAtual();
  const { key, cert } = carregarCredenciais();
  const { xml } = montarXmlDps(dados, ambiente);

  const dpsXmlGZipB64 = gzipSync(Buffer.from(xml, "utf8")).toString("base64");
  const url = `${AMBIENTES[ambiente].baseUrl}/nfse`;

  const { status, body } = await postJson(url, JSON.stringify({ dpsXmlGZipB64 }), key, cert);

  if (status === 201) {
    const resposta = JSON.parse(body) as RespostaSucesso;
    const nfseXml = gunzipSync(Buffer.from(resposta.nfseXmlGZipB64, "base64")).toString("utf8");
    return { chaveAcesso: resposta.chaveAcesso, xml: nfseXml, ambiente };
  }

  let mensagem = `Falha ao emitir NFS-e (HTTP ${status}).`;
  try {
    const erro = JSON.parse(body) as RespostaErro;
    if (erro.erros?.length) {
      mensagem = erro.erros.map((e) => `${e.codigo}: ${e.descricao}`).join(" | ");
    }
  } catch {
    // corpo não veio em JSON — mantém a mensagem genérica com o status HTTP.
  }
  throw new Error(mensagem);
}

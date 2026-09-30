import { DOMParser } from "@xmldom/xmldom";
import xpath from "xpath";

// Lê o XML oficial da NFS-e (o que o governo devolve na emissão, guardado em
// OrdemServico.nfseXml) e extrai só o que a gente precisa pra montar um
// comprovante apresentável — sem depender de mexer no XML original, que
// precisa continuar intacto (é o documento fiscal de verdade).

export type NfseDados = {
  numero: string | null;
  dataProcessamento: Date | null;
  tributacaoNacional: string | null;
  tributacaoMunicipal: string | null;
  descricaoNBS: string | null;
  prestador: {
    cnpj: string | null;
    im: string | null;
    nome: string | null;
    logradouro: string | null;
    numero: string | null;
    bairro: string | null;
    cidade: string | null;
    uf: string | null;
    cep: string | null;
  };
  valores: {
    baseCalculo: number | null;
    aliquota: number | null;
    valorIssqn: number | null;
    valorRetido: number | null;
    valorLiquido: number | null;
  };
  informacoesComplementares: string | null;
};

function texto(doc: Document, caminho: string): string | null {
  const no = xpath.select1(caminho, doc) as Node | undefined;
  const valor = no?.textContent?.trim();
  return valor || null;
}

function numero(doc: Document, caminho: string): number | null {
  const t = texto(doc, caminho);
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

// xpath com local-name() pra não depender do prefixo/namespace exato do XML.
const p = (tag: string) => `//*[local-name(.)='${tag}']`;

export function parseNfseXml(xml: string): NfseDados {
  const doc = new DOMParser({ errorHandler: () => {} }).parseFromString(xml, "text/xml") as unknown as Document;

  const dhProc = texto(doc, p("dhProc"));

  return {
    numero: texto(doc, p("nNFSe")),
    dataProcessamento: dhProc ? new Date(dhProc) : null,
    tributacaoNacional: texto(doc, p("xTribNac")),
    tributacaoMunicipal: texto(doc, p("xTribMun")),
    descricaoNBS: texto(doc, p("xNBS")),
    prestador: {
      cnpj: texto(doc, `${p("emit")}/*[local-name(.)='CNPJ']`),
      im: texto(doc, `${p("emit")}/*[local-name(.)='IM']`),
      nome: texto(doc, `${p("emit")}/*[local-name(.)='xNome']`),
      logradouro: texto(doc, p("xLgr")),
      numero: texto(doc, `${p("enderNac")}/*[local-name(.)='nro']`),
      bairro: texto(doc, p("xBairro")),
      cidade: texto(doc, p("xLocIncid")) ?? texto(doc, p("xMun")),
      uf: texto(doc, `${p("enderNac")}/*[local-name(.)='UF']`),
      cep: texto(doc, `${p("enderNac")}/*[local-name(.)='CEP']`),
    },
    valores: {
      baseCalculo: numero(doc, p("vBC")),
      aliquota: numero(doc, p("pAliqAplic")),
      valorIssqn: numero(doc, p("vISSQN")),
      valorRetido: numero(doc, p("vTotalRet")),
      valorLiquido: numero(doc, p("vLiq")),
    },
    informacoesComplementares: texto(doc, p("xOutInf")),
  };
}

// Resolve nome de cidade + UF pro código de município do IBGE (7 dígitos),
// exigido pelo webservice de NFS-e no endereço do tomador (cliente). Usa a
// API pública e oficial do IBGE — nunca inventamos esse código.
//
// Brasília-DF é o caso mais comum de longe (a prestadora do serviço é
// sempre de lá), então tem um atalho fixo pra não bater na API à toa; pra
// qualquer outra cidade/UF, consulta a lista de municípios daquele estado
// e procura pelo nome (comparação sem acento/maiúsculas).

const COD_MUNICIPIO_BRASILIA = "5300108";

type MunicipioIBGE = { id: number; nome: string };

// Marcas de acentuação combinantes (U+0300–U+036F) que sobram depois do
// normalize("NFD") — construído por código de caractere pra evitar
// ambiguidade de encoding no próprio arquivo-fonte.
const REGEX_DIACRITICOS = new RegExp(
  `[\\u${(0x0300).toString(16).padStart(4, "0")}-\\u${(0x036f).toString(16).padStart(4, "0")}]`,
  "g"
);

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(REGEX_DIACRITICOS, "").trim().toLowerCase();
}

const cacheMunicipiosPorUF = new Map<string, MunicipioIBGE[]>();

async function municipiosDoEstado(uf: string): Promise<MunicipioIBGE[]> {
  const ufNormalizada = uf.trim().toUpperCase();
  const cache = cacheMunicipiosPorUF.get(ufNormalizada);
  if (cache) return cache;

  const res = await fetch(
    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${ufNormalizada}/municipios`,
    { signal: AbortSignal.timeout(10000) }
  );
  if (!res.ok) {
    throw new Error(`Falha ao consultar municípios do IBGE pra UF ${ufNormalizada} (HTTP ${res.status}).`);
  }
  const lista = (await res.json()) as MunicipioIBGE[];
  cacheMunicipiosPorUF.set(ufNormalizada, lista);
  return lista;
}

/**
 * Retorna o código IBGE (7 dígitos, string) da cidade+UF informada.
 * Lança erro claro se a cidade não for encontrada — nunca "chuta" um
 * código, já que isso vai num documento fiscal.
 */
export async function codigoMunicipioIBGE(cidade: string, uf: string): Promise<string> {
  const cidadeNormalizada = normalizar(cidade);
  const ufNormalizada = uf.trim().toUpperCase();

  if (ufNormalizada === "DF" && cidadeNormalizada === "brasilia") {
    return COD_MUNICIPIO_BRASILIA;
  }

  const municipios = await municipiosDoEstado(ufNormalizada);
  const encontrado = municipios.find((m) => normalizar(m.nome) === cidadeNormalizada);
  if (!encontrado) {
    throw new Error(
      `Cidade "${cidade}/${ufNormalizada}" não encontrada na base do IBGE. Confira a grafia do nome da cidade e a UF no cadastro do cliente.`
    );
  }
  return String(encontrado.id);
}

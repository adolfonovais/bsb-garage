// Ponto de extensão para emissão de Nota Fiscal de Serviço (NFS-e).
//
// Decisão tomada em 31/08/2026: emissão via webservice/API GRATUITA do
// governo (Distrito Federal e/ou padrão NFS-e Nacional), não via provedor
// pago — em vez de Focus NFe/eNotas/PlugNotas. Empresa emitente: PRIMEA
// GESTÃO DE SERVIÇOS LTDA, CNPJ 64.531.214/0001-77 (Simples Nacional,
// Brasília-DF) — não confundir com o CNPJ da pousada, que é outro,
// separado (ver memória "maytra-pousada-cnpj-separado").
//
// Ainda falta:
//   1. Certificado digital A1 (e-CNPJ) da Primea — usuário vai comprar.
//   2. Confirmar/implementar a integração real com o webservice do DF
//      (iss.fazenda.df.gov.br) e/ou a API NFS-e Nacional (nfse.gov.br).
//
// Quando isso estiver pronto, esta função assina e envia o XML/payload
// pro webservice correto (certificado em variável de ambiente/arquivo
// seguro, como já fazemos com outras credenciais) e o botão "Emitir
// NFS-e" na tela da Ordem de Serviço deixa de ficar desabilitado.

export function nfseConfigurada(): boolean {
  return Boolean(process.env.NFSE_PROVEDOR && process.env.NFSE_TOKEN);
}

export async function emitirNFSe(_params: {
  osId: string;
  valor: number;
  descricao: string;
}): Promise<{ url: string } | null> {
  if (!nfseConfigurada()) {
    console.log("[nfse] Emissão de NFS-e ainda não configurada (ver src/lib/nfse.ts).");
    return null;
  }

  // TODO: integrar com o provedor escolhido (Focus NFe / eNotas / PlugNotas).
  throw new Error("Integração de NFS-e ainda não implementada.");
}

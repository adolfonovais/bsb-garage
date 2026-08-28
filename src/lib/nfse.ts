// Ponto de extensão para emissão de Nota Fiscal de Serviço (NFS-e).
//
// Isso ainda não está implementado porque depende de decisões e cadastros
// que só você pode fazer:
//   1. Escolher um provedor de emissão (ex: Focus NFe, eNotas, PlugNotas) e
//      criar uma conta lá.
//   2. Ter um certificado digital A1 da empresa que vai emitir a nota.
//   3. Confirmar qual CNPJ vai emitir (o do Garage, hoje "ADOLFO DE NOVAIS
//      PINTO NETO ME" — não confundir com o CNPJ novo que está sendo aberto
//      para a pousada).
//
// Quando isso estiver definido, esta função passa a chamar a API do
// provedor escolhido (token, URL etc. em variáveis de ambiente, como já
// fazemos com SMTP em src/lib/mail.ts) e o botão "Emitir NFS-e" na tela da
// Ordem de Serviço deixa de ficar desabilitado.

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

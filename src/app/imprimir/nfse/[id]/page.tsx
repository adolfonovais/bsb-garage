import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { organizacaoAtual } from "@/lib/tenant";
import { logoDaOrganizacao } from "@/lib/marca";
import { nomeArquivoImpressao, numeroFormatado, paraNumero } from "@/lib/format";
import { parseNfseXml } from "@/lib/nfse-parse";
import { DocumentoNfseImprimivel } from "@/components/DocumentoNfseImprimivel";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const os = await prisma.ordemServico.findUnique({
    where: { id },
    select: { numero: true, ano: true, veiculo: true, cliente: { select: { nome: true } } },
  });
  if (!os) return {};
  return { title: `NFS-e — ${nomeArquivoImpressao("OS", os.numero, os.ano, os.veiculo, os.cliente.nome)}` };
}

export default async function ImprimirNfsePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [os, organizacao, empresa] = await Promise.all([
    prisma.ordemServico.findUnique({
      where: { id },
      select: {
        id: true,
        numero: true,
        ano: true,
        valorTotal: true,
        cliente: { select: { nome: true, cpf: true, telefone: true } },
        itens: { orderBy: { ordem: "asc" }, select: { descricao: true, valorTotal: true } },
        nfseChaveAcesso: true,
        nfseXml: true,
        nfseAmbiente: true,
        nfseUrlVisualizacao: true,
      },
    }),
    organizacaoAtual(),
    prisma.empresaConfig.findFirst(),
  ]);

  // Sem NFS-e emitida ainda não tem o que mostrar aqui — nada pra reformatar.
  if (!os || !os.nfseChaveAcesso || !os.nfseXml) notFound();

  const dados = parseNfseXml(os.nfseXml);

  return (
    <DocumentoNfseImprimivel
      logoUrl={logoDaOrganizacao(organizacao)}
      nomeEmpresa={organizacao.nome}
      enderecoLoja={empresa?.endereco}
      osReferencia={numeroFormatado(os.numero, os.ano)}
      chaveAcesso={os.nfseChaveAcesso}
      ambiente={os.nfseAmbiente}
      urlVisualizacao={os.nfseUrlVisualizacao}
      cliente={os.cliente}
      itens={os.itens}
      valorTotal={paraNumero(os.valorTotal)}
      dados={dados}
      voltarHref={`/ordens-servico/${os.id}`}
    />
  );
}

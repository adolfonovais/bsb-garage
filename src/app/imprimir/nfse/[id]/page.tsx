import { notFound } from "next/navigation";
import { prismaBase } from "@/lib/prisma-base";
import { organizacaoParaImpressao } from "@/lib/doc-acesso";
import { logoDaOrganizacao } from "@/lib/marca";
import { nomeArquivoImpressao, numeroFormatado, paraNumero } from "@/lib/format";
import { parseNfseXml } from "@/lib/nfse-parse";
import { DocumentoNfseImprimivel } from "@/components/DocumentoNfseImprimivel";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const os = await prismaBase.ordemServico.findUnique({
    where: { id },
    select: { numero: true, ano: true, veiculo: true, cliente: { select: { nome: true } } },
  });
  if (!os) return {};
  return { title: `NFS-e — ${nomeArquivoImpressao("OS", os.numero, os.ano, os.veiculo, os.cliente.nome)}` };
}

export default async function ImprimirNfsePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ id }, { token }] = await Promise.all([params, searchParams]);
  const organizacaoId = await organizacaoParaImpressao("nfse", id, token);

  const [os, organizacao, empresa] = await Promise.all([
    prismaBase.ordemServico.findUnique({
      where: { id, organizacaoId },
      select: {
        id: true,
        numero: true,
        ano: true,
        valorTotal: true,
        cliente: { select: { nome: true, cpf: true, cnpj: true, telefone: true } },
        veiculo: { select: { modelo: true, placa: true } },
        itens: {
          orderBy: { ordem: "asc" },
          select: { descricao: true, valorTotal: true, tipoServico: { select: { nome: true } } },
        },
        nfseChaveAcesso: true,
        nfseXml: true,
        nfseAmbiente: true,
        nfseUrlVisualizacao: true,
      },
    }),
    prismaBase.organizacao.findUniqueOrThrow({ where: { id: organizacaoId } }),
    prismaBase.empresaConfig.findUnique({ where: { organizacaoId } }),
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
      veiculo={os.veiculo}
      itens={os.itens.map((item) => ({
        descricao: item.tipoServico ? `${item.tipoServico.nome} — ${item.descricao}` : item.descricao,
        valorTotal: item.valorTotal,
      }))}
      valorTotal={paraNumero(os.valorTotal)}
      dados={dados}
      voltarHref={`/ordens-servico/${os.id}`}
    />
  );
}

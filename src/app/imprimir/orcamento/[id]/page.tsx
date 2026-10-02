import { notFound } from "next/navigation";
import { prismaBase } from "@/lib/prisma-base";
import { organizacaoParaImpressao } from "@/lib/doc-acesso";
import { logoDaOrganizacao } from "@/lib/marca";
import { nomeArquivoImpressao, numeroFormatado } from "@/lib/format";
import { DocumentoImprimivel } from "@/components/DocumentoImprimivel";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orcamento = await prismaBase.orcamento.findUnique({
    where: { id },
    select: { numero: true, ano: true, veiculo: true, cliente: { select: { nome: true } } },
  });
  if (!orcamento) return {};
  return {
    title: nomeArquivoImpressao("Orçamento", orcamento.numero, orcamento.ano, orcamento.veiculo, orcamento.cliente.nome),
  };
}

export default async function ImprimirOrcamentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ id }, { token }] = await Promise.all([params, searchParams]);
  const organizacaoId = await organizacaoParaImpressao("orcamento", id, token);

  const [orcamento, organizacao, empresa] = await Promise.all([
    prismaBase.orcamento.findUnique({
      where: { id, organizacaoId },
      include: { cliente: true, veiculo: true, itens: { orderBy: { ordem: "asc" } } },
    }),
    prismaBase.organizacao.findUniqueOrThrow({ where: { id: organizacaoId } }),
    prismaBase.empresaConfig.findUnique({ where: { organizacaoId } }),
  ]);

  if (!orcamento) notFound();

  return (
    <DocumentoImprimivel
      logoUrl={logoDaOrganizacao(organizacao)}
      voltarHref={`/orcamentos/${orcamento.id}`}
      empresa={
        empresa ?? {
          nome: organizacao.nome,
          razaoSocial: null,
          cnpj: null,
          ie: null,
          telefones: null,
          cidadeUf: "",
        }
      }
      titulo="Orçamento"
      numero={numeroFormatado(orcamento.numero, orcamento.ano)}
      data={orcamento.data}
      cliente={orcamento.cliente}
      veiculo={orcamento.veiculo}
      itens={orcamento.itens}
      total={orcamento.valorTotal}
      observacoes={orcamento.observacoes}
      rodape={
        <p className="mb-4 text-sm italic text-slate-600">
          Orçamento válido por {orcamento.validadeDias} dias a partir da data de emissão.
        </p>
      }
    />
  );
}

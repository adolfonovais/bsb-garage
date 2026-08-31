import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { nomeArquivoImpressao, numeroFormatado } from "@/lib/format";
import { DocumentoImprimivel } from "@/components/DocumentoImprimivel";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orcamento = await prisma.orcamento.findUnique({
    where: { id },
    select: { numero: true, ano: true, veiculo: true, cliente: { select: { nome: true } } },
  });
  if (!orcamento) return {};
  return { title: nomeArquivoImpressao(orcamento.numero, orcamento.ano, orcamento.veiculo, orcamento.cliente.nome) };
}

export default async function ImprimirOrcamentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [orcamento, empresa] = await Promise.all([
    prisma.orcamento.findUnique({
      where: { id },
      include: { cliente: true, veiculo: true, itens: { orderBy: { ordem: "asc" } } },
    }),
    prisma.empresaConfig.findUnique({ where: { id: 1 } }),
  ]);

  if (!orcamento) notFound();

  return (
    <DocumentoImprimivel
      empresa={
        empresa ?? {
          nome: "BSB Garage Martelinho de Ouro",
          razaoSocial: null,
          cnpj: null,
          ie: null,
          telefones: null,
          cidadeUf: "Brasília - DF",
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

import { notFound } from "next/navigation";
import { prismaBase } from "@/lib/prisma-base";
import { organizacaoParaImpressao } from "@/lib/doc-acesso";
import { logoDaOrganizacao } from "@/lib/marca";
import { formatarData, formatarMoeda, nomeArquivoImpressao, numeroFormatado, paraNumero } from "@/lib/format";
import { DocumentoImprimivel } from "@/components/DocumentoImprimivel";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const os = await prismaBase.ordemServico.findUnique({
    where: { id },
    select: { numero: true, ano: true, veiculo: true, cliente: { select: { nome: true } } },
  });
  if (!os) return {};
  return { title: nomeArquivoImpressao("OS", os.numero, os.ano, os.veiculo, os.cliente.nome) };
}

export default async function ImprimirOSPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ id }, { token }] = await Promise.all([params, searchParams]);
  const organizacaoId = await organizacaoParaImpressao("os", id, token);

  const [os, organizacao, empresa] = await Promise.all([
    prismaBase.ordemServico.findUnique({
      where: { id, organizacaoId },
      include: {
        cliente: true,
        veiculo: true,
        itens: { orderBy: { ordem: "asc" } },
        pagamentos: { orderBy: { data: "asc" } },
      },
    }),
    prismaBase.organizacao.findUniqueOrThrow({ where: { id: organizacaoId } }),
    prismaBase.empresaConfig.findUnique({ where: { organizacaoId } }),
  ]);

  if (!os) notFound();

  const totalRecebido = os.pagamentos.reduce((soma, p) => soma + paraNumero(p.valor), 0);
  const aReceber = Math.max(paraNumero(os.valorTotal) - totalRecebido, 0);

  return (
    <DocumentoImprimivel
      logoUrl={logoDaOrganizacao(organizacao)}
      voltarHref={`/ordens-servico/${os.id}`}
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
      titulo="Ordem de Serviço"
      numero={numeroFormatado(os.numero, os.ano)}
      data={os.dataEntrada}
      cliente={os.cliente}
      veiculo={os.veiculo}
      itens={os.itens}
      total={os.valorTotal}
      observacoes={os.observacoes}
      rodape={
        <div className="mb-4">
          <p className="mb-1 text-sm font-semibold uppercase text-slate-700">Controle de pagamentos</p>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-400 text-left">
                <th className="py-1">Data</th>
                <th className="py-1">Descrição</th>
                <th className="py-1 text-right">Recebido</th>
              </tr>
            </thead>
            <tbody>
              {os.pagamentos.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-1 text-slate-500">
                    Nenhum pagamento registrado.
                  </td>
                </tr>
              ) : (
                os.pagamentos.map((p) => (
                  <tr key={p.id} className="border-b border-slate-200">
                    <td className="py-1">{formatarData(p.data)}</td>
                    <td className="py-1">{p.descricao ?? "-"}</td>
                    <td className="py-1 text-right">{formatarMoeda(p.valor)}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="pt-2 font-semibold">
                  A receber
                </td>
                <td className="pt-2 text-right font-semibold">{formatarMoeda(aReceber)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      }
    />
  );
}

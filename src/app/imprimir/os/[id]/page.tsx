import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatarData, formatarMoeda, nomeArquivoImpressao, numeroFormatado, paraNumero } from "@/lib/format";
import { DocumentoImprimivel } from "@/components/DocumentoImprimivel";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const os = await prisma.ordemServico.findUnique({
    where: { id },
    select: { numero: true, ano: true, veiculo: true, cliente: { select: { nome: true } } },
  });
  if (!os) return {};
  return { title: nomeArquivoImpressao(os.numero, os.ano, os.veiculo, os.cliente.nome) };
}

export default async function ImprimirOSPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [os, empresa] = await Promise.all([
    prisma.ordemServico.findUnique({
      where: { id },
      include: {
        cliente: true,
        veiculo: true,
        itens: { orderBy: { ordem: "asc" } },
        pagamentos: { orderBy: { data: "asc" } },
      },
    }),
    prisma.empresaConfig.findUnique({ where: { id: 1 } }),
  ]);

  if (!os) notFound();

  const totalRecebido = os.pagamentos.reduce((soma, p) => soma + paraNumero(p.valor), 0);
  const aReceber = Math.max(paraNumero(os.valorTotal) - totalRecebido, 0);

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

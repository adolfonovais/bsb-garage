import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatarData, formatarVeiculo, paraNumero, STATUS_OS_LABEL, numeroFormatado } from "@/lib/format";
import { Badge, Card, PageHeader } from "@/components/ui";
import { Valor } from "@/components/ValoresPrivacidade";
import { FileText, Wrench, Clock, Wallet } from "lucide-react";

export default async function DashboardPage() {
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const [osAbertas, orcamentosPendentes, osDoMes, pagamentosDoMes, ultimasOS] = await Promise.all([
    prisma.ordemServico.count({
      where: { status: { in: ["ABERTA", "EM_ANDAMENTO", "AGUARDANDO_PECA"] } },
    }),
    prisma.orcamento.count({ where: { status: "PENDENTE" } }),
    prisma.ordemServico.aggregate({
      where: { dataEntrada: { gte: inicioMes } },
      _sum: { valorTotal: true },
      _count: true,
    }),
    prisma.pagamento.aggregate({
      where: { data: { gte: inicioMes } },
      _sum: { valor: true },
    }),
    prisma.ordemServico.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { cliente: true, veiculo: true },
    }),
  ]);

  const totalPrevistoMes = Number(osDoMes._sum.valorTotal ?? 0);
  const totalRecebidoMes = Number(pagamentosDoMes._sum.valor ?? 0);
  const aReceberMes = Math.max(totalPrevistoMes - totalRecebidoMes, 0);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Visão geral da oficina" />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-4 p-4">
          <div className="rounded-full bg-sky-100 p-3 text-sky-700">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">OS em aberto</p>
            <p className="text-xl font-bold text-slate-900">{osAbertas}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-4">
          <div className="rounded-full bg-amber-100 p-3 text-amber-700">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Orçamentos pendentes</p>
            <p className="text-xl font-bold text-slate-900">{orcamentosPendentes}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-4">
          <div className="rounded-full bg-emerald-100 p-3 text-emerald-700">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Faturado no mês (OS)</p>
            <p className="text-xl font-bold text-slate-900"><Valor valor={totalPrevistoMes} /></p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-4">
          <div className="rounded-full bg-red-100 p-3 text-red-700">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">A receber no mês</p>
            <p className="text-xl font-bold text-slate-900"><Valor valor={aReceberMes} /></p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Últimas Ordens de Serviço</h2>
        </div>
        {ultimasOS.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">Nenhuma ordem de serviço cadastrada ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">Número</th>
                  <th className="px-4 py-2">Cliente</th>
                  <th className="hidden px-4 py-2 sm:table-cell">Veículo</th>
                  <th className="hidden px-4 py-2 sm:table-cell">Entrada</th>
                  <th className="px-4 py-2">Valor</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ultimasOS.map((os) => (
                  <tr key={os.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <Link href={`/ordens-servico/${os.id}`} className="font-medium text-amber-700 hover:underline">
                        {numeroFormatado(os.numero, os.ano)}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{os.cliente?.nome}</td>
                    <td className="hidden px-4 py-2 sm:table-cell">{formatarVeiculo(os.veiculo)}</td>
                    <td className="hidden px-4 py-2 sm:table-cell">{formatarData(os.dataEntrada)}</td>
                    <td className="px-4 py-2"><Valor valor={paraNumero(os.valorTotal)} /></td>
                    <td className="px-4 py-2">
                      <Badge status={os.status} label={STATUS_OS_LABEL[os.status]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

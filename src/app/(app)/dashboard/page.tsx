import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatarData, formatarVeiculo, paraNumero, STATUS_OS_LABEL, numeroFormatado } from "@/lib/format";
import { Badge, Button, Card, Field, Input, LinkButton, PageHeader, Select } from "@/components/ui";
import { Valor } from "@/components/ValoresPrivacidade";
import { FileText, Wrench, Clock, Wallet } from "lucide-react";

const STATUS_OPCOES = [
  { value: "", label: "Todos os status" },
  { value: "ABERTA", label: "Abertas" },
  { value: "EM_ANDAMENTO", label: "Em andamento" },
  { value: "AGUARDANDO_PECA", label: "Aguardando peça" },
  { value: "CONCLUIDA", label: "Concluídas" },
  { value: "ENTREGUE", label: "Entregues" },
  { value: "CANCELADA", label: "Canceladas" },
];

function inicioDoMes(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ inicio?: string; fim?: string; status?: string }>;
}) {
  const params = await searchParams;
  const inicioStr = params.inicio || inicioDoMes();
  const fimStr = params.fim || hoje();
  const status = params.status || "";

  const inicio = new Date(`${inicioStr}T00:00:00`);
  const fim = new Date(`${fimStr}T23:59:59.999`);

  // "OS em aberto" e "Orçamentos pendentes" são o volume atual em aberto —
  // não fazem sentido presos a um período, então ficam sempre no total geral.
  // O período/status filtram o faturamento e a lista de OS abaixo.
  const filtroOSPeriodo = {
    dataEntrada: { gte: inicio, lte: fim },
    ...(status ? { status: status as never } : {}),
  };

  const [osAbertas, orcamentosPendentes, osDoPeriodo, pagamentosDoPeriodo, osFiltradas] = await Promise.all([
    prisma.ordemServico.count({
      where: { status: { in: ["ABERTA", "EM_ANDAMENTO", "AGUARDANDO_PECA"] } },
    }),
    prisma.orcamento.count({ where: { status: "PENDENTE" } }),
    prisma.ordemServico.aggregate({
      where: filtroOSPeriodo,
      _sum: { valorTotal: true },
      _count: true,
    }),
    prisma.pagamento.aggregate({
      where: { data: { gte: inicio, lte: fim } },
      _sum: { valor: true },
    }),
    prisma.ordemServico.findMany({
      where: filtroOSPeriodo,
      orderBy: { dataEntrada: "desc" },
      take: 100,
      include: { cliente: true, veiculo: true },
    }),
  ]);

  const totalPrevistoPeriodo = paraNumero(osDoPeriodo._sum.valorTotal);
  const totalRecebidoPeriodo = paraNumero(pagamentosDoPeriodo._sum.valor);
  const aReceberPeriodo = Math.max(totalPrevistoPeriodo - totalRecebidoPeriodo, 0);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Visão geral da oficina" />

      <Card className="mb-6 p-4">
        <form action="/dashboard" method="get" className="grid grid-cols-1 gap-4 sm:grid-cols-4 sm:items-end">
          <Field label="De">
            <Input name="inicio" type="date" defaultValue={inicioStr} required />
          </Field>
          <Field label="Até">
            <Input name="fim" type="date" defaultValue={fimStr} required />
          </Field>
          <Field label="Status da OS">
            <Select name="status" defaultValue={status}>
              {STATUS_OPCOES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex gap-2">
            <Button type="submit">Filtrar</Button>
            <LinkButton href="/dashboard" variant="secondary">
              Limpar
            </LinkButton>
          </div>
        </form>
      </Card>

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
            <p className="text-xs text-slate-500">Faturado no período ({osDoPeriodo._count} OS)</p>
            <p className="text-xl font-bold text-slate-900">
              <Valor valor={totalPrevistoPeriodo} />
            </p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-4">
          <div className="rounded-full bg-red-100 p-3 text-red-700">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">A receber no período</p>
            <p className="text-xl font-bold text-slate-900">
              <Valor valor={aReceberPeriodo} />
            </p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Ordens de Serviço no período</h2>
        </div>
        {osFiltradas.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">Nenhuma ordem de serviço encontrada nesse período/status.</p>
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
                {osFiltradas.map((os) => (
                  <tr key={os.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <Link href={`/ordens-servico/${os.id}`} className="font-medium text-amber-700 hover:underline">
                        {numeroFormatado(os.numero, os.ano)}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{os.cliente?.nome}</td>
                    <td className="hidden px-4 py-2 sm:table-cell">{formatarVeiculo(os.veiculo)}</td>
                    <td className="hidden px-4 py-2 sm:table-cell">{formatarData(os.dataEntrada)}</td>
                    <td className="px-4 py-2">
                      <Valor valor={paraNumero(os.valorTotal)} />
                    </td>
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

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { formatarData, formatarMoeda, formatarVeiculo, numeroFormatado, STATUS_ORCAMENTO_LABEL } from "@/lib/format";

const STATUS_TABS = [
  { value: undefined, label: "Todos" },
  { value: "PENDENTE", label: "Pendentes" },
  { value: "APROVADO", label: "Aprovados" },
  { value: "RECUSADO", label: "Recusados" },
  { value: "EXPIRADO", label: "Expirados" },
];

export default async function OrcamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const orcamentos = await prisma.orcamento.findMany({
    where: status ? { status: status as never } : undefined,
    include: { cliente: true, veiculo: true },
    orderBy: [{ ano: "desc" }, { numero: "desc" }],
    take: 200,
  });

  return (
    <div>
      <PageHeader
        title="Orçamentos"
        actions={<LinkButton href="/orcamentos/novo">Novo orçamento</LinkButton>}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.label}
            href={tab.value ? `/orcamentos?status=${tab.value}` : "/orcamentos"}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              status === tab.value || (!status && !tab.value)
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {orcamentos.length === 0 ? (
        <EmptyState>Nenhum orçamento encontrado.</EmptyState>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">Número</th>
                  <th className="px-4 py-2">Cliente</th>
                  <th className="px-4 py-2">Veículo</th>
                  <th className="px-4 py-2">Data</th>
                  <th className="px-4 py-2">Valor</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orcamentos.map((orc) => (
                  <tr key={orc.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <Link href={`/orcamentos/${orc.id}`} className="font-medium text-amber-700 hover:underline">
                        {numeroFormatado(orc.numero, orc.ano)}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{orc.cliente?.nome}</td>
                    <td className="px-4 py-2">{formatarVeiculo(orc.veiculo)}</td>
                    <td className="px-4 py-2">{formatarData(orc.data)}</td>
                    <td className="px-4 py-2">{formatarMoeda(orc.valorTotal)}</td>
                    <td className="px-4 py-2">
                      <Badge status={orc.status} label={STATUS_ORCAMENTO_LABEL[orc.status]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { StatusTabLink } from "@/components/StatusTabLink";
import { formatarData, formatarVeiculo, numeroFormatado, paraNumero, STATUS_OS_LABEL } from "@/lib/format";
import { Valor } from "@/components/ValoresPrivacidade";

const STATUS_TABS = [
  { value: undefined, label: "Todas" },
  { value: "ABERTA", label: "Abertas" },
  { value: "EM_ANDAMENTO", label: "Em andamento" },
  { value: "AGUARDANDO_PECA", label: "Aguardando peça" },
  { value: "CONCLUIDA", label: "Concluídas" },
  { value: "ENTREGUE", label: "Entregues" },
];

export default async function OrdensServicoPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const ordens = await prisma.ordemServico.findMany({
    where: status ? { status: status as never } : undefined,
    include: { cliente: true, veiculo: true },
    orderBy: [{ ano: "desc" }, { numero: "desc" }],
    take: 200,
  });

  return (
    <div>
      <PageHeader
        title="Ordens de Serviço"
        actions={<LinkButton href="/ordens-servico/novo">Nova OS</LinkButton>}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <StatusTabLink
            key={tab.label}
            href={tab.value ? `/ordens-servico?status=${tab.value}` : "/ordens-servico"}
            active={status === tab.value || (!status && !tab.value)}
          >
            {tab.label}
          </StatusTabLink>
        ))}
      </div>

      {ordens.length === 0 ? (
        <EmptyState>Nenhuma ordem de serviço encontrada.</EmptyState>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">Número</th>
                  <th className="px-4 py-2">Cliente</th>
                  <th className="px-4 py-2">Veículo</th>
                  <th className="px-4 py-2">Entrada</th>
                  <th className="px-4 py-2">Valor</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ordens.map((os) => (
                  <tr key={os.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <Link href={`/ordens-servico/${os.id}`} className="font-medium text-amber-700 hover:underline">
                        {numeroFormatado(os.numero, os.ano)}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{os.cliente?.nome}</td>
                    <td className="px-4 py-2">{formatarVeiculo(os.veiculo)}</td>
                    <td className="px-4 py-2">{formatarData(os.dataEntrada)}</td>
                    <td className="px-4 py-2"><Valor valor={paraNumero(os.valorTotal)} /></td>
                    <td className="px-4 py-2">
                      <Badge status={os.status} label={STATUS_OS_LABEL[os.status]} />
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

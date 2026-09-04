import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import {
  formatarData,
  paraNumero,
  STATUS_PAGAMENTO_OFICINA_LABEL,
  STATUS_REPASSE_LABEL,
} from "@/lib/format";
import { Valor } from "@/components/ValoresPrivacidade";
import { StatusTabLink } from "@/components/StatusTabLink";

const STATUS_TABS = [
  { value: "EM_ANDAMENTO", label: "Em andamento" },
  { value: "ENTREGUE", label: "Entregue" },
  { value: "CANCELADO", label: "Cancelado" },
];

export default async function RepassesPage({
  searchParams,
}: {
  searchParams: Promise<{ oficinaId?: string; pagamento?: string; status?: string }>;
}) {
  const { oficinaId, pagamento, status } = await searchParams;

  // Monta a URL de cada filtro preservando os outros já ativos — dá pra
  // combinar oficina + status + pagamento ao mesmo tempo.
  function hrefComFiltros(overrides: Record<string, string | undefined>) {
    const valores = { oficinaId, pagamento, status, ...overrides };
    const params = new URLSearchParams();
    for (const [chave, valor] of Object.entries(valores)) {
      if (valor) params.set(chave, valor);
    }
    const qs = params.toString();
    return qs ? `/repasses?${qs}` : "/repasses";
  }

  const [repasses, oficinas] = await Promise.all([
    prisma.repasseOficina.findMany({
      where: {
        oficinaId: oficinaId || undefined,
        status: status ? (status as never) : undefined,
        statusPagamentoOficina: pagamento ? (pagamento as never) : undefined,
      },
      include: { oficina: true },
      orderBy: { dataEntrada: "desc" },
      take: 200,
    }),
    prisma.oficinaTerceirizada.findMany({ orderBy: { nome: "asc" } }),
  ]);

  const totalPecas = repasses.reduce((soma, r) => soma + r.qtdPecas, 0);

  return (
    <div>
      <PageHeader
        title="Repasses para prestadores terceirizados"
        actions={<LinkButton href="/repasses/novo">Novo repasse</LinkButton>}
      />

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <StatusTabLink href="/repasses" active={!oficinaId && !pagamento && !status}>
          Todos
        </StatusTabLink>
        {STATUS_TABS.map((tab) => (
          <StatusTabLink key={tab.value} href={hrefComFiltros({ status: tab.value })} active={status === tab.value}>
            {tab.label}
          </StatusTabLink>
        ))}
        <StatusTabLink href={hrefComFiltros({ pagamento: "PENDENTE" })} active={pagamento === "PENDENTE"}>
          Pagamento pendente
        </StatusTabLink>
        {oficinas.map((o) => (
          <StatusTabLink key={o.id} href={hrefComFiltros({ oficinaId: o.id })} active={oficinaId === o.id}>
            {o.nome}
          </StatusTabLink>
        ))}
      </div>

      {oficinaId && repasses.length > 0 && (
        <p className="mb-4 text-sm text-slate-600">
          <strong className="text-slate-900">{totalPecas}</strong>{" "}
          {totalPecas === 1 ? "peça repassada" : "peças repassadas"} pra {repasses[0].oficina.nome} em{" "}
          {repasses.length} {repasses.length === 1 ? "repasse" : "repasses"}.
        </p>
      )}

      {repasses.length === 0 ? (
        <EmptyState>Nenhum repasse encontrado.</EmptyState>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">Entrada</th>
                  <th className="px-4 py-2">Prestador</th>
                  <th className="px-4 py-2">Carro</th>
                  <th className="px-4 py-2">Serviço</th>
                  <th className="px-4 py-2">Peças</th>
                  <th className="px-4 py-2">Cobrado</th>
                  <th className="px-4 py-2">Custo</th>
                  <th className="px-4 py-2">Lucro</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Pagamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {repasses.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <Link href={`/repasses/${r.id}`} className="font-medium text-amber-700 hover:underline">
                        {formatarData(r.dataEntrada)}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{r.oficina.nome}</td>
                    <td className="px-4 py-2">
                      {r.carro} {r.placa ? `· ${r.placa}` : ""}
                    </td>
                    <td className="px-4 py-2">{r.tipoServico}</td>
                    <td className="px-4 py-2">{r.qtdPecas}</td>
                    <td className="px-4 py-2"><Valor valor={paraNumero(r.valorCobrado)} /></td>
                    <td className="px-4 py-2"><Valor valor={paraNumero(r.custoTotal)} /></td>
                    <td className="px-4 py-2 text-emerald-700"><Valor valor={paraNumero(r.lucro)} /></td>
                    <td className="px-4 py-2">
                      <Badge status={r.status} label={STATUS_REPASSE_LABEL[r.status]} />
                    </td>
                    <td className="px-4 py-2">
                      <Badge
                        status={r.statusPagamentoOficina}
                        label={STATUS_PAGAMENTO_OFICINA_LABEL[r.statusPagamentoOficina]}
                      />
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

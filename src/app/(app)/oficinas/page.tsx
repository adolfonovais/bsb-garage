import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { formatarMoeda, paraNumero } from "@/lib/format";

export default async function OficinasPage() {
  const [oficinas, resumos] = await Promise.all([
    prisma.oficinaTerceirizada.findMany({ orderBy: { nome: "asc" } }),
    prisma.repasseOficina.groupBy({
      by: ["oficinaId"],
      _sum: { qtdPecas: true, valorCobrado: true, custoTotal: true, lucro: true },
      _count: true,
    }),
  ]);

  const resumoPorOficina = new Map(resumos.map((r) => [r.oficinaId, r]));

  return (
    <div>
      <PageHeader
        title="Oficinas terceirizadas"
        subtitle="Parceiras que recebem repasses de serviço (pintura, lanternagem etc.)"
        actions={<LinkButton href="/oficinas/novo">Nova oficina</LinkButton>}
      />

      {oficinas.length === 0 ? (
        <EmptyState>Nenhuma oficina cadastrada ainda.</EmptyState>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">Oficina</th>
                  <th className="px-4 py-2">Repasses</th>
                  <th className="px-4 py-2">Peças</th>
                  <th className="px-4 py-2">Receita total</th>
                  <th className="px-4 py-2">Custo total</th>
                  <th className="px-4 py-2">Lucro total</th>
                  <th className="px-4 py-2">Lucro médio/peça</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {oficinas.map((oficina) => {
                  const r = resumoPorOficina.get(oficina.id);
                  const pecas = r?._sum.qtdPecas ?? 0;
                  const lucro = paraNumero(r?._sum.lucro);
                  const lucroMedio = pecas > 0 ? lucro / pecas : 0;
                  return (
                    <tr key={oficina.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2">
                        <Link href={`/oficinas/${oficina.id}`} className="font-medium text-amber-700 hover:underline">
                          {oficina.nome}
                        </Link>
                        {!oficina.ativo && <span className="ml-2 text-xs text-slate-400">(inativa)</span>}
                      </td>
                      <td className="px-4 py-2">{r?._count ?? 0}</td>
                      <td className="px-4 py-2">{pecas}</td>
                      <td className="px-4 py-2">{formatarMoeda(r?._sum.valorCobrado)}</td>
                      <td className="px-4 py-2">{formatarMoeda(r?._sum.custoTotal)}</td>
                      <td className="px-4 py-2 font-medium text-emerald-700">{formatarMoeda(r?._sum.lucro)}</td>
                      <td className="px-4 py-2">{formatarMoeda(lucroMedio)}</td>
                      <td className="px-4 py-2">{oficina.ativo ? "Ativa" : "Inativa"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prismaBase } from "@/lib/prisma-base";
import { ehAdminDaPlataforma, organizacaoIdAtual } from "@/lib/tenant";
import { Badge, Card, PageHeader } from "@/components/ui";
import { formatarData } from "@/lib/format";
import { alternarOrganizacaoAtiva, estenderTeste } from "./actions";

export default async function PlataformaPage() {
  const session = await auth();
  if (!ehAdminDaPlataforma(session?.user?.email)) redirect("/dashboard");

  const minhaOrg = await organizacaoIdAtual();
  const organizacoes = await prismaBase.organizacao.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { usuarios: true, clientes: true, ordensServico: true } },
      usuarios: { where: { papel: "ADMIN" }, orderBy: { createdAt: "asc" }, take: 1, select: { nome: true, email: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Plataforma"
        subtitle={`${organizacoes.length} ${organizacoes.length === 1 ? "organização" : "organizações"} cadastradas`}
      />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Organização</th>
                <th className="px-4 py-2">Responsável</th>
                <th className="px-4 py-2">Criada em</th>
                <th className="px-4 py-2">Plano</th>
                <th className="px-4 py-2">Usuários</th>
                <th className="px-4 py-2">Clientes</th>
                <th className="px-4 py-2">OS</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {organizacoes.map((o) => {
                const admin = o.usuarios[0];
                return (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-900">
                      {o.nome}
                      <span className="block text-xs font-normal text-slate-400">{o.slug}</span>
                    </td>
                    <td className="px-4 py-2">
                      {admin ? (
                        <>
                          {admin.nome}
                          <span className="block text-xs text-slate-400">{admin.email}</span>
                        </>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-2">{formatarData(o.createdAt)}</td>
                    <td className="px-4 py-2">
                      {o.plano}
                      {o.plano === "trial" && o.trialTerminaEm && (
                        <span className="block text-xs text-slate-400">até {formatarData(o.trialTerminaEm)}</span>
                      )}
                    </td>
                    <td className="px-4 py-2">{o._count.usuarios}</td>
                    <td className="px-4 py-2">{o._count.clientes}</td>
                    <td className="px-4 py-2">{o._count.ordensServico}</td>
                    <td className="px-4 py-2">
                      <Badge status={o.ativa ? "PAGA" : "CANCELADA"} label={o.ativa ? "Ativa" : "Suspensa"} />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2 text-xs">
                        {o.plano === "trial" && (
                          <form action={estenderTeste.bind(null, o.id)}>
                            <button type="submit" className="text-amber-700 hover:underline">
                              +30 dias
                            </button>
                          </form>
                        )}
                        {o.id !== minhaOrg && (
                          <form action={alternarOrganizacaoAtiva.bind(null, o.id, !o.ativa)}>
                            <button type="submit" className="text-red-700 hover:underline">
                              {o.ativa ? "Suspender" : "Reativar"}
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

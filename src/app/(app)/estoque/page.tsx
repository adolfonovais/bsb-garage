import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { paraNumero } from "@/lib/format";
import { AlertTriangle } from "lucide-react";
import { Valor } from "@/components/ValoresPrivacidade";

export default async function EstoquePage() {
  const pecas = await prisma.peca.findMany({ orderBy: { nome: "asc" } });

  const emFalta = pecas.filter((p) => paraNumero(p.quantidadeAtual) < paraNumero(p.quantidadeMinima));

  return (
    <div>
      <PageHeader
        title="Estoque de peças e materiais"
        subtitle="Tinta, massa, verniz, lixa e outros insumos"
        actions={<LinkButton href="/estoque/novo">Novo item</LinkButton>}
      />

      {emFalta.length > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong>{emFalta.length}</strong> {emFalta.length === 1 ? "item está" : "itens estão"} abaixo da
            quantidade mínima: {emFalta.map((p) => p.nome).join(", ")}.
          </span>
        </div>
      )}

      {pecas.length === 0 ? (
        <EmptyState>Nenhum item cadastrado ainda.</EmptyState>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">Item</th>
                  <th className="px-4 py-2">Qtd. atual</th>
                  <th className="px-4 py-2">Qtd. mínima</th>
                  <th className="px-4 py-2">Custo unitário</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pecas.map((peca) => {
                  const abaixoDoMinimo = paraNumero(peca.quantidadeAtual) < paraNumero(peca.quantidadeMinima);
                  return (
                    <tr key={peca.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2">
                        <Link href={`/estoque/${peca.id}`} className="font-medium text-amber-700 hover:underline">
                          {peca.nome}
                        </Link>
                      </td>
                      <td className={`px-4 py-2 ${abaixoDoMinimo ? "font-semibold text-red-700" : ""}`}>
                        {paraNumero(peca.quantidadeAtual)} {peca.unidade}
                        {abaixoDoMinimo && " ⚠"}
                      </td>
                      <td className="px-4 py-2 text-slate-500">
                        {paraNumero(peca.quantidadeMinima)} {peca.unidade}
                      </td>
                      <td className="px-4 py-2">{peca.custoUnitario ? <Valor valor={paraNumero(peca.custoUnitario)} /> : "-"}</td>
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

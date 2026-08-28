import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, EmptyState, Input, LinkButton, PageHeader } from "@/components/ui";
import { Search } from "lucide-react";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const termo = q?.trim();

  const clientes = await prisma.cliente.findMany({
    where: termo
      ? {
          OR: [
            { nome: { contains: termo, mode: "insensitive" } },
            { telefone: { contains: termo, mode: "insensitive" } },
            { veiculos: { some: { placa: { contains: termo, mode: "insensitive" } } } },
          ],
        }
      : undefined,
    include: { veiculos: true },
    orderBy: { nome: "asc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle="Cadastro de clientes e veículos"
        actions={<LinkButton href="/clientes/novo">Novo cliente</LinkButton>}
      />

      <form className="mb-4 max-w-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            name="q"
            defaultValue={termo}
            placeholder="Buscar por nome, telefone ou placa..."
            className="pl-9"
          />
        </div>
      </form>

      {clientes.length === 0 ? (
        <EmptyState>Nenhum cliente encontrado.</EmptyState>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">Nome</th>
                  <th className="px-4 py-2">Telefone</th>
                  <th className="px-4 py-2">Veículos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clientes.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <Link href={`/clientes/${cliente.id}`} className="font-medium text-amber-700 hover:underline">
                        {cliente.nome}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{cliente.telefone ?? "-"}</td>
                    <td className="px-4 py-2">
                      {cliente.veiculos.length === 0
                        ? "-"
                        : cliente.veiculos.map((v) => v.placa || v.modelo).join(", ")}
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

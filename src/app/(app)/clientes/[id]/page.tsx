import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  atualizarCliente,
  criarVeiculo,
  excluirCliente,
  excluirVeiculo,
} from "@/app/(app)/clientes/actions";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Textarea,
} from "@/components/ui";
import { formatarData, formatarMoeda, formatarVeiculo, numeroFormatado, STATUS_OS_LABEL } from "@/lib/format";
import { Trash2 } from "lucide-react";

export default async function ClienteDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      veiculos: { orderBy: { createdAt: "desc" } },
      ordensServico: {
        orderBy: { createdAt: "desc" },
        include: { veiculo: true },
      },
    },
  });

  if (!cliente) notFound();

  const atualizarComId = atualizarCliente.bind(null, cliente.id);
  const excluirComId = excluirCliente.bind(null, cliente.id);
  const criarVeiculoComId = criarVeiculo.bind(null, cliente.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={cliente.nome}
        subtitle="Dados do cliente, veículos e histórico de serviços"
        actions={
          <form action={excluirComId}>
            <Button variant="danger" type="submit">
              <Trash2 className="h-4 w-4" /> Excluir cliente
            </Button>
          </form>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Dados do cliente</h2>
          <form action={atualizarComId} className="space-y-4">
            <Field label="Nome *">
              <Input name="nome" defaultValue={cliente.nome} required />
            </Field>
            <Field label="Telefone">
              <Input name="telefone" defaultValue={cliente.telefone ?? ""} />
            </Field>
            <Field label="E-mail">
              <Input type="email" name="email" defaultValue={cliente.email ?? ""} />
            </Field>
            <Field label="Endereço">
              <Textarea name="endereco" rows={2} defaultValue={cliente.endereco ?? ""} />
            </Field>
            <div className="flex justify-end">
              <Button type="submit">Salvar alterações</Button>
            </div>
          </form>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Veículos</h2>
          <div className="mb-4 space-y-2">
            {cliente.veiculos.length === 0 && (
              <p className="text-sm text-slate-500">Nenhum veículo cadastrado.</p>
            )}
            {cliente.veiculos.map((veiculo) => (
              <div
                key={veiculo.id}
                className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-slate-900">
                    {veiculo.modelo} {veiculo.cor ? `· ${veiculo.cor}` : ""}
                  </p>
                  <p className="text-xs text-slate-500">
                    {veiculo.placa ?? "sem placa"} {veiculo.ano ? `· ${veiculo.ano}` : ""}
                  </p>
                </div>
                <form action={excluirVeiculo.bind(null, cliente.id, veiculo.id)}>
                  <button type="submit" className="text-slate-400 hover:text-red-600" title="Remover veículo">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              </div>
            ))}
          </div>

          <details className="rounded-md border border-dashed border-slate-300 p-3">
            <summary className="cursor-pointer text-sm font-medium text-amber-700">
              + Adicionar veículo
            </summary>
            <form action={criarVeiculoComId} className="mt-3 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Field label="Modelo *">
                  <Input name="modelo" required />
                </Field>
              </div>
              <Field label="Placa">
                <Input name="placa" className="uppercase" />
              </Field>
              <Field label="Cor">
                <Input name="cor" />
              </Field>
              <Field label="Ano">
                <Input name="ano" type="number" />
              </Field>
              <div className="col-span-2 flex justify-end">
                <Button type="submit">Adicionar</Button>
              </div>
            </form>
          </details>
        </Card>
      </div>

      <Card>
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Histórico de Ordens de Serviço</h2>
        </div>
        {cliente.ordensServico.length === 0 ? (
          <div className="p-4">
            <EmptyState>Nenhuma ordem de serviço para este cliente ainda.</EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">Número</th>
                  <th className="px-4 py-2">Veículo</th>
                  <th className="px-4 py-2">Entrada</th>
                  <th className="px-4 py-2">Valor</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cliente.ordensServico.map((os) => (
                  <tr key={os.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <Link href={`/ordens-servico/${os.id}`} className="font-medium text-amber-700 hover:underline">
                        {numeroFormatado(os.numero, os.ano)}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{formatarVeiculo(os.veiculo)}</td>
                    <td className="px-4 py-2">{formatarData(os.dataEntrada)}</td>
                    <td className="px-4 py-2">{formatarMoeda(os.valorTotal)}</td>
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

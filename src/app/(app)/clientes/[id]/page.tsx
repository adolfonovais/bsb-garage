import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  atualizarCliente,
  atualizarVeiculo,
  criarVeiculo,
  excluirCliente,
  excluirVeiculo,
} from "@/app/(app)/clientes/actions";
import {
  Badge,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
} from "@/components/ui";
import { formatarData, formatarMoeda, formatarVeiculo, numeroFormatado, STATUS_OS_LABEL } from "@/lib/format";
import { Trash2 } from "lucide-react";
import { BotaoCancelarEdicao, EdicaoInline, FormularioComFechamento } from "@/components/EdicaoInline";
import { EditarVeiculoForm, NovoVeiculoForm } from "@/components/VeiculoForms";
import { SubmitButton } from "@/components/SubmitButton";

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
            <SubmitButton variant="danger">
              <Trash2 className="h-4 w-4" /> Excluir cliente
            </SubmitButton>
          </form>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Dados do cliente</h2>
          <EdicaoInline
            visualizacao={
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs uppercase text-slate-500">Nome</p>
                  <p className="text-slate-900">{cliente.nome}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">CPF</p>
                  <p className="text-slate-900">{cliente.cpf || "-"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">Telefone</p>
                  <p className="text-slate-900">{cliente.telefone || "-"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">E-mail</p>
                  <p className="text-slate-900">{cliente.email || "-"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">Endereço</p>
                  <p className="text-slate-900">
                    {cliente.logradouro
                      ? `${cliente.logradouro}, ${cliente.numero || "S/N"} - ${cliente.bairro || ""} - ${cliente.cidade || ""}/${cliente.uf || ""} - CEP ${cliente.cep || ""}`
                      : "-"}
                  </p>
                </div>
              </div>
            }
            formulario={
              <FormularioComFechamento action={atualizarComId} className="space-y-4">
                <Field label="Nome *">
                  <Input name="nome" defaultValue={cliente.nome} required />
                </Field>
                <Field label="CPF">
                  <Input name="cpf" defaultValue={cliente.cpf ?? ""} placeholder="000.000.000-00" />
                </Field>
                <Field label="Telefone">
                  <Input name="telefone" defaultValue={cliente.telefone ?? ""} />
                </Field>
                <Field label="E-mail">
                  <Input type="email" name="email" defaultValue={cliente.email ?? ""} />
                </Field>

                <div className="border-t border-slate-200 pt-4">
                  <h3 className="mb-1 text-sm font-semibold text-slate-900">Endereço</h3>
                  <p className="mb-3 text-xs text-slate-500">Necessário pra emitir NFS-e (Nota Fiscal) pra esse cliente.</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Logradouro (rua, avenida...)">
                      <Input name="logradouro" defaultValue={cliente.logradouro ?? ""} />
                    </Field>
                    <Field label="Número">
                      <Input name="numero" defaultValue={cliente.numero ?? ""} />
                    </Field>
                    <Field label="Bairro">
                      <Input name="bairro" defaultValue={cliente.bairro ?? ""} />
                    </Field>
                    <Field label="CEP">
                      <Input name="cep" defaultValue={cliente.cep ?? ""} placeholder="00000-000" />
                    </Field>
                    <Field label="Cidade">
                      <Input name="cidade" defaultValue={cliente.cidade ?? "Brasília"} />
                    </Field>
                    <Field label="UF">
                      <Input name="uf" defaultValue={cliente.uf ?? "DF"} maxLength={2} />
                    </Field>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <BotaoCancelarEdicao />
                  <SubmitButton>Salvar</SubmitButton>
                </div>
              </FormularioComFechamento>
            }
          />
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Veículos</h2>
          <div className="mb-4 space-y-2">
            {cliente.veiculos.length === 0 && (
              <p className="text-sm text-slate-500">Nenhum veículo cadastrado.</p>
            )}
            {cliente.veiculos.map((veiculo) => (
              <div key={veiculo.id} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">
                      {veiculo.modelo} {veiculo.cor ? `· ${veiculo.cor}` : ""}
                    </p>
                    <p className="text-xs text-slate-500">
                      {veiculo.placa ?? "sem placa"} {veiculo.ano ? `· ${veiculo.ano}` : ""}
                    </p>
                  </div>
                  <EditarVeiculoForm veiculo={veiculo} atualizarVeiculo={atualizarVeiculo.bind(null, cliente.id, veiculo.id)} />
                </div>
                <form action={excluirVeiculo.bind(null, cliente.id, veiculo.id)} className="mt-1 flex justify-end">
                  <button
                    type="submit"
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-600"
                    title="Remover veículo"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remover
                  </button>
                </form>
              </div>
            ))}
          </div>

          <NovoVeiculoForm criarVeiculo={criarVeiculoComId} />
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

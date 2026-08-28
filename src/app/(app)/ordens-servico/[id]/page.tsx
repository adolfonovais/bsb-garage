import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  atualizarStatusOS,
  excluirOS,
  excluirPagamento,
  registrarPagamento,
} from "@/app/(app)/ordens-servico/actions";
import { Badge, Button, Card, Field, Input, LinkButton, PageHeader, Select } from "@/components/ui";
import { formatarData, formatarMoeda, numeroFormatado, paraNumero, STATUS_OS_LABEL } from "@/lib/format";
import { Printer, Trash2 } from "lucide-react";

const PROXIMO_STATUS: Record<string, { valor: string; label: string }[]> = {
  ABERTA: [
    { valor: "EM_ANDAMENTO", label: "Iniciar serviço" },
    { valor: "CANCELADA", label: "Cancelar" },
  ],
  EM_ANDAMENTO: [
    { valor: "AGUARDANDO_PECA", label: "Aguardando peça" },
    { valor: "CONCLUIDA", label: "Marcar como concluída" },
  ],
  AGUARDANDO_PECA: [{ valor: "EM_ANDAMENTO", label: "Retomar serviço" }],
  CONCLUIDA: [{ valor: "ENTREGUE", label: "Marcar como entregue" }],
  ENTREGUE: [],
  CANCELADA: [],
};

export default async function OSDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const os = await prisma.ordemServico.findUnique({
    where: { id },
    include: {
      cliente: true,
      veiculo: true,
      itens: { orderBy: { ordem: "asc" } },
      pagamentos: { orderBy: { data: "asc" } },
    },
  });

  if (!os) notFound();

  const totalRecebido = os.pagamentos.reduce((soma, p) => soma + paraNumero(p.valor), 0);
  const aReceber = Math.max(paraNumero(os.valorTotal) - totalRecebido, 0);
  const registrarPagamentoComId = registrarPagamento.bind(null, os.id);
  const excluirComId = excluirOS.bind(null, os.id);

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title={`OS ${numeroFormatado(os.numero, os.ano)}`}
        subtitle={`Entrada em ${formatarData(os.dataEntrada)}${os.dataSaidaReal ? ` · Entregue em ${formatarData(os.dataSaidaReal)}` : ""}`}
        actions={
          <>
            <Badge status={os.status} label={STATUS_OS_LABEL[os.status]} />
            <LinkButton href={`/imprimir/os/${os.id}`} variant="secondary">
              <Printer className="h-4 w-4" /> Imprimir / PDF
            </LinkButton>
          </>
        }
      />

      <Card className="p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase text-slate-500">Cliente</p>
            <p className="font-medium text-slate-900">
              <Link href={`/clientes/${os.clienteId}`} className="hover:underline">
                {os.cliente.nome}
              </Link>
            </p>
            <p className="text-sm text-slate-500">{os.cliente.telefone}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Veículo</p>
            <p className="font-medium text-slate-900">
              {os.veiculo ? `${os.veiculo.modelo} - ${os.veiculo.placa ?? "sem placa"}` : "-"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Forma de pagamento</p>
            <p className="font-medium text-slate-900">{os.formaPagamento ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Previsão de saída</p>
            <p className="font-medium text-slate-900">{formatarData(os.dataSaidaPrevista)}</p>
          </div>
        </div>
        {os.observacoes && (
          <p className="mt-4 border-t border-slate-200 pt-4 text-sm text-slate-600">
            <span className="font-medium">Observações: </span>
            {os.observacoes}
          </p>
        )}
      </Card>

      <Card>
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Itens de serviço</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Descrição</th>
              <th className="px-4 py-2">Qtd.</th>
              <th className="px-4 py-2">Valor unit.</th>
              <th className="px-4 py-2">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {os.itens.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-2">{item.descricao}</td>
                <td className="px-4 py-2">{Number(item.quantidade)}</td>
                <td className="px-4 py-2">{formatarMoeda(item.valorUnit)}</td>
                <td className="px-4 py-2">{formatarMoeda(item.valorTotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200">
              <td className="px-4 py-2 font-semibold" colSpan={3}>
                Total
              </td>
              <td className="px-4 py-2 font-semibold">{formatarMoeda(os.valorTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Status</h2>
        <div className="flex flex-wrap gap-2">
          {PROXIMO_STATUS[os.status]?.map((opcao) => (
            <form key={opcao.valor} action={atualizarStatusOS.bind(null, os.id, opcao.valor)}>
              <Button type="submit" variant={opcao.valor === "CANCELADA" ? "danger" : "primary"}>
                {opcao.label}
              </Button>
            </form>
          ))}
          {(!PROXIMO_STATUS[os.status] || PROXIMO_STATUS[os.status].length === 0) && (
            <p className="text-sm text-slate-500">Esta OS está finalizada.</p>
          )}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Controle de pagamentos</h2>
          <div className="text-right text-sm">
            <p className="text-emerald-700">Recebido: {formatarMoeda(totalRecebido)}</p>
            <p className={aReceber > 0 ? "text-red-700" : "text-slate-500"}>
              A receber: {formatarMoeda(aReceber)}
            </p>
          </div>
        </div>

        {os.pagamentos.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Data</th>
                <th className="px-4 py-2">Descrição</th>
                <th className="px-4 py-2">Forma</th>
                <th className="px-4 py-2">Valor</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {os.pagamentos.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2">{formatarData(p.data)}</td>
                  <td className="px-4 py-2">{p.descricao ?? "-"}</td>
                  <td className="px-4 py-2">{p.formaPagamento ?? "-"}</td>
                  <td className="px-4 py-2">{formatarMoeda(p.valor)}</td>
                  <td className="px-4 py-2 text-right">
                    <form action={excluirPagamento.bind(null, os.id, p.id)}>
                      <button type="submit" className="text-slate-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <details className="border-t border-slate-200 p-4">
          <summary className="cursor-pointer text-sm font-medium text-amber-700">
            + Registrar pagamento
          </summary>
          <form action={registrarPagamentoComId} className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Data">
              <Input name="data" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
            </Field>
            <Field label="Descrição">
              <Input name="descricao" placeholder="Ex: Entrada, 1ª parcela..." />
            </Field>
            <Field label="Forma">
              <Select name="formaPagamento" defaultValue="">
                <option value="">-</option>
                <option>Dinheiro</option>
                <option>PIX</option>
                <option>Débito</option>
                <option>Crédito</option>
                <option>Transferência</option>
              </Select>
            </Field>
            <Field label="Valor *">
              <Input name="valor" type="number" step="0.01" min="0" required />
            </Field>
            <div className="col-span-2 sm:col-span-4 flex justify-end">
              <Button type="submit">Registrar</Button>
            </div>
          </form>
        </details>
      </Card>

      <Card className="flex justify-end p-4">
        <form action={excluirComId}>
          <Button type="submit" variant="ghost">
            <Trash2 className="h-4 w-4" /> Excluir OS
          </Button>
        </form>
      </Card>
    </div>
  );
}

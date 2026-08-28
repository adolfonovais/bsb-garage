import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  atualizarStatusOrcamento,
  converterEmOS,
  excluirOrcamento,
} from "@/app/(app)/orcamentos/actions";
import { Badge, Button, Card, LinkButton, PageHeader } from "@/components/ui";
import { formatarData, formatarMoeda, numeroFormatado, STATUS_ORCAMENTO_LABEL } from "@/lib/format";
import { Printer, Trash2 } from "lucide-react";

export default async function OrcamentoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const orcamento = await prisma.orcamento.findUnique({
    where: { id },
    include: {
      cliente: true,
      veiculo: true,
      itens: { orderBy: { ordem: "asc" } },
      ordensServico: true,
    },
  });

  if (!orcamento) notFound();

  const jaConvertido = orcamento.ordensServico.length > 0;
  const aprovarAction = atualizarStatusOrcamento.bind(null, orcamento.id, "APROVADO");
  const recusarAction = atualizarStatusOrcamento.bind(null, orcamento.id, "RECUSADO");
  const converterAction = converterEmOS.bind(null, orcamento.id);
  const excluirAction = excluirOrcamento.bind(null, orcamento.id);

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title={`Orçamento ${numeroFormatado(orcamento.numero, orcamento.ano)}`}
        subtitle={`Criado em ${formatarData(orcamento.data)} · válido por ${orcamento.validadeDias} dias`}
        actions={
          <>
            <Badge status={orcamento.status} label={STATUS_ORCAMENTO_LABEL[orcamento.status]} />
            <LinkButton href={`/imprimir/orcamento/${orcamento.id}`} variant="secondary">
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
              <Link href={`/clientes/${orcamento.clienteId}`} className="hover:underline">
                {orcamento.cliente.nome}
              </Link>
            </p>
            <p className="text-sm text-slate-500">{orcamento.cliente.telefone}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Veículo</p>
            <p className="font-medium text-slate-900">
              {orcamento.veiculo ? `${orcamento.veiculo.modelo} - ${orcamento.veiculo.placa ?? "sem placa"}` : "-"}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Itens</h2>
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
            {orcamento.itens.map((item) => (
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
              <td className="px-4 py-2 font-semibold">{formatarMoeda(orcamento.valorTotal)}</td>
            </tr>
          </tfoot>
        </table>
        {orcamento.observacoes && (
          <div className="border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
            <span className="font-medium">Observações: </span>
            {orcamento.observacoes}
          </div>
        )}
      </Card>

      <Card className="flex flex-wrap items-center gap-3 p-4">
        {orcamento.status === "PENDENTE" && (
          <>
            <form action={aprovarAction}>
              <Button type="submit">Aprovar</Button>
            </form>
            <form action={recusarAction}>
              <Button type="submit" variant="secondary">
                Recusar
              </Button>
            </form>
          </>
        )}
        {!jaConvertido ? (
          <form action={converterAction}>
            <Button type="submit" variant="primary">
              Converter em Ordem de Serviço
            </Button>
          </form>
        ) : (
          <LinkButton href={`/ordens-servico/${orcamento.ordensServico[0].id}`} variant="secondary">
            Ver Ordem de Serviço gerada
          </LinkButton>
        )}
        <form action={excluirAction} className="ml-auto">
          <Button type="submit" variant="ghost">
            <Trash2 className="h-4 w-4" /> Excluir
          </Button>
        </form>
      </Card>
    </div>
  );
}

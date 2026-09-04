import Link from "next/link";
import type { ContaFinanceira } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { atualizarConta, criarConta, excluirConta, marcarContaPaga, reabrirConta } from "@/app/(app)/financeiro/actions";
import { Card, EmptyState, Field, Input, PageHeader } from "@/components/ui";
import { BotaoCancelarDetails, DetailsForm } from "@/components/DetailsForm";
import { ContaItem } from "@/components/ContaItem";
import { formatarData, numeroFormatado, paraNumero } from "@/lib/format";
import { Wallet, TrendingDown, TrendingUp } from "lucide-react";
import { SubmitButton } from "@/components/SubmitButton";
import { Valor } from "@/components/ValoresPrivacidade";

export default async function FinanceiroPage() {
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const [contas, ordensAbertas, repassesPendentes, pagamentosDoMes] = await Promise.all([
    prisma.contaFinanceira.findMany({ orderBy: { dataVencimento: "asc" } }),
    prisma.ordemServico.findMany({
      where: { status: { not: "CANCELADA" } },
      include: { cliente: true, pagamentos: true },
      orderBy: { dataEntrada: "asc" },
    }),
    prisma.repasseOficina.findMany({
      where: { statusPagamentoOficina: "PENDENTE" },
      include: { oficina: true },
      orderBy: { dataEntrada: "asc" },
    }),
    prisma.pagamento.aggregate({ where: { data: { gte: inicioMes } }, _sum: { valor: true } }),
  ]);

  const osComSaldo = ordensAbertas
    .map((os) => ({
      os,
      saldo: paraNumero(os.valorTotal) - os.pagamentos.reduce((s, p) => s + paraNumero(p.valor), 0),
    }))
    .filter((x) => x.saldo > 0.01);

  const contasPagar = contas.filter((c) => c.tipo === "PAGAR");
  const contasReceber = contas.filter((c) => c.tipo === "RECEBER");

  const totalAReceberOS = osComSaldo.reduce((s, x) => s + x.saldo, 0);
  const totalAReceberContas = contasReceber
    .filter((c) => c.status !== "PAGA" && c.status !== "CANCELADA")
    .reduce((s, c) => s + paraNumero(c.valor), 0);
  const totalAPagarRepasses = repassesPendentes.reduce((s, r) => s + paraNumero(r.custoTotal), 0);
  const totalAPagarContas = contasPagar
    .filter((c) => c.status !== "PAGA" && c.status !== "CANCELADA")
    .reduce((s, c) => s + paraNumero(c.valor), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Financeiro" subtitle="Contas a pagar, a receber e visão de caixa" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-4 p-4">
          <div className="rounded-full bg-emerald-100 p-3 text-emerald-700">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">A receber (clientes)</p>
            <p className="text-xl font-bold text-slate-900"><Valor valor={totalAReceberOS} /></p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-4">
          <div className="rounded-full bg-emerald-100 p-3 text-emerald-700">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">A receber (outras contas)</p>
            <p className="text-xl font-bold text-slate-900"><Valor valor={totalAReceberContas} /></p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-4">
          <div className="rounded-full bg-red-100 p-3 text-red-700">
            <TrendingDown className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">A pagar (oficinas)</p>
            <p className="text-xl font-bold text-slate-900"><Valor valor={totalAPagarRepasses} /></p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-4">
          <div className="rounded-full bg-red-100 p-3 text-red-700">
            <TrendingDown className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">A pagar (outras contas)</p>
            <p className="text-xl font-bold text-slate-900"><Valor valor={totalAPagarContas} /></p>
          </div>
        </Card>
      </div>

      <Card className="flex items-center gap-4 p-4">
        <div className="rounded-full bg-amber-100 p-3 text-amber-700">
          <Wallet className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-slate-500">Recebido de clientes este mês (pagamentos de OS)</p>
          <p className="text-xl font-bold text-slate-900"><Valor valor={paraNumero(pagamentosDoMes._sum.valor)} /></p>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">A receber de clientes (OS em aberto)</h2>
          </div>
          {osComSaldo.length === 0 ? (
            <div className="p-4">
              <EmptyState>Nenhuma OS com saldo pendente.</EmptyState>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {osComSaldo.map(({ os, saldo }) => (
                <li key={os.id} className="flex items-center justify-between px-4 py-2">
                  <Link href={`/ordens-servico/${os.id}`} className="text-amber-700 hover:underline">
                    {numeroFormatado(os.numero, os.ano)} — {os.cliente.nome}
                  </Link>
                  <span className="font-medium"><Valor valor={saldo} /></span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">A pagar a oficinas terceirizadas</h2>
          </div>
          {repassesPendentes.length === 0 ? (
            <div className="p-4">
              <EmptyState>Nenhum repasse com pagamento pendente.</EmptyState>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {repassesPendentes.map((r) => (
                <li key={r.id} className="flex items-center justify-between px-4 py-2">
                  <Link href={`/repasses/${r.id}`} className="text-amber-700 hover:underline">
                    {r.oficina.nome} — {r.carro}
                  </Link>
                  <span className="font-medium"><Valor valor={paraNumero(r.custoTotal)} /></span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ContasCard titulo="Contas a pagar" tipo="PAGAR" contas={contasPagar} />
        <ContasCard titulo="Contas a receber" tipo="RECEBER" contas={contasReceber} />
      </div>
    </div>
  );
}

function ContasCard({
  titulo,
  tipo,
  contas,
}: {
  titulo: string;
  tipo: "PAGAR" | "RECEBER";
  contas: ContaFinanceira[];
}) {
  return (
    <Card>
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">{titulo}</h2>
      </div>
      {contas.length === 0 ? (
        <div className="p-4">
          <EmptyState>Nenhuma conta cadastrada.</EmptyState>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 text-sm">
          {contas.map((c) => (
            <ContaItem
              key={c.id}
              conta={{
                id: c.id,
                tipo: c.tipo,
                descricao: c.descricao,
                categoria: c.categoria,
                valor: paraNumero(c.valor),
                dataVencimentoInput: c.dataVencimento.toISOString().slice(0, 10),
                dataVencimentoFormatada: formatarData(c.dataVencimento),
                recorrente: c.recorrente,
                status: c.status,
              }}
              acaoAtualizar={atualizarConta.bind(null, c.id)}
              acaoMarcarPaga={marcarContaPaga}
              acaoReabrir={reabrirConta}
              acaoExcluir={excluirConta}
            />
          ))}
        </ul>
      )}

      <DetailsForm
        resumo="+ Nova conta"
        detailsClassName="border-t border-slate-200 p-4"
        action={criarConta}
        formClassName="mt-3 grid grid-cols-2 gap-3"
        limparAoSalvar
      >
        <input type="hidden" name="tipo" value={tipo} />
        <div className="col-span-2">
          <Field label="Descrição *">
            <Input name="descricao" required placeholder={tipo === "PAGAR" ? "Ex: Aluguel, luz, insumos..." : "Ex: Adiantamento de cliente..."} />
          </Field>
        </div>
        <Field label="Categoria">
          <Input name="categoria" placeholder="Opcional" />
        </Field>
        <Field label="Vencimento *">
          <Input name="dataVencimento" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
        </Field>
        <div className="col-span-2">
          <Field label="Valor *">
            <Input name="valor" type="number" step="0.01" min="0" required />
          </Field>
        </div>
        {tipo === "PAGAR" && (
          <label className="col-span-2 flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="recorrente" className="h-4 w-4 rounded border-slate-300" />
            Conta recorrente (repete todo mês — gera a próxima ao marcar como paga)
          </label>
        )}
        <div className="col-span-2 flex justify-end gap-3">
          <BotaoCancelarDetails />
          <SubmitButton>Adicionar</SubmitButton>
        </div>
      </DetailsForm>
    </Card>
  );
}

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  buscarRelatorioEstoque,
  buscarRelatorioFinanceiro,
  buscarRelatorioOficinas,
  buscarRelatorioServicos,
  SECAO_LABEL,
  SECOES_RELATORIO,
  type SecaoRelatorio,
} from "@/lib/relatorios";
import { Button, Card, EmptyState, Field, Input, PageHeader } from "@/components/ui";
import { formatarData, formatarMoeda, numeroFormatado, STATUS_OS_LABEL } from "@/lib/format";
import { PrintButton } from "@/components/PrintButton";
import { Download } from "lucide-react";

function inicioDoMes(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ inicio?: string; fim?: string; secoes?: string | string[] }>;
}) {
  const params = await searchParams;
  const gerado = params.secoes !== undefined;

  const secoesSelecionadas: SecaoRelatorio[] = gerado
    ? SECOES_RELATORIO.filter((s) =>
        Array.isArray(params.secoes) ? params.secoes.includes(s) : params.secoes === s
      )
    : [...SECOES_RELATORIO];

  const inicioStr = params.inicio || inicioDoMes();
  const fimStr = params.fim || hoje();
  const inicio = new Date(`${inicioStr}T00:00:00`);
  const fim = new Date(`${fimStr}T00:00:00`);

  const empresa = await prisma.empresaConfig.findUnique({ where: { id: 1 } });

  const [financeiro, servicos, oficinas, estoque] = await Promise.all([
    gerado && secoesSelecionadas.includes("financeiro") ? buscarRelatorioFinanceiro(inicio, fim) : null,
    gerado && secoesSelecionadas.includes("servicos") ? buscarRelatorioServicos(inicio, fim) : null,
    gerado && secoesSelecionadas.includes("oficinas") ? buscarRelatorioOficinas(inicio, fim) : null,
    gerado && secoesSelecionadas.includes("estoque") ? buscarRelatorioEstoque() : null,
  ]);

  const exportHref = `/api/relatorios/export?inicio=${inicioStr}&fim=${fimStr}&${secoesSelecionadas
    .map((s) => `secoes=${s}`)
    .join("&")}`;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="print:hidden">
        <PageHeader
          title="Relatórios"
          subtitle="Escolha o período e o que deve entrar no relatório"
          actions={
            gerado ? (
              <div className="flex flex-col items-stretch gap-2">
                <a
                  href={exportHref}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-300 transition-colors hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" /> Exportar Excel
                </a>
                <PrintButton inline />
              </div>
            ) : undefined
          }
        />
      </div>

      <Card className="p-6 print:hidden">
        <form action="/relatorios" method="get" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="De">
              <Input name="inicio" type="date" defaultValue={inicioStr} required />
            </Field>
            <Field label="Até">
              <Input name="fim" type="date" defaultValue={fimStr} required />
            </Field>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">O que incluir</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SECOES_RELATORIO.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="secoes"
                    value={s}
                    defaultChecked={!gerado || secoesSelecionadas.includes(s)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  {SECAO_LABEL[s]}
                </label>
              ))}
            </div>
            {SECOES_RELATORIO.includes("estoque") && (
              <p className="mt-2 text-xs text-slate-500">
                Obs: o relatório de Estoque sempre mostra a posição atual (não é filtrado por período).
              </p>
            )}
          </div>
          <div className="flex justify-end">
            <Button type="submit">Gerar relatório</Button>
          </div>
        </form>
      </Card>

      {gerado && (
        <div className="space-y-6">
          <header className="flex items-center gap-4 border-b-2 border-slate-900 pb-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo estática, precisa renderizar igual na impressão/PDF */}
            <img src="/brand/logo.png" alt="" className="h-16 w-16 shrink-0" />
            <div className="flex-1 text-center">
              <h1 className="text-xl font-extrabold">{empresa?.nome ?? "BSB Garage Martelinho de Ouro"}</h1>
              <p className="text-sm text-slate-600">
                Relatório de {formatarData(inicio)} até {formatarData(fim)}
              </p>
            </div>
            {/* espaçador pra manter o texto centralizado apesar da logo à esquerda */}
            <div className="h-16 w-16 shrink-0" aria-hidden />
          </header>

          {financeiro && (
            <Card className="p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase text-slate-500">
                {SECAO_LABEL.financeiro}
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Resumo label="Faturado (OS)" valor={financeiro.faturado} sub={`${financeiro.qtdOS} OS`} />
                <Resumo label="Recebido de clientes" valor={financeiro.recebidoClientes} cor="text-emerald-700" />
                <Resumo label="Pago a oficinas" valor={financeiro.custoOficinas} cor="text-red-700" />
                <Resumo label="Outras contas pagas" valor={financeiro.outrasContasPagas} cor="text-red-700" />
                <Resumo label="Outras contas recebidas" valor={financeiro.outrasContasRecebidas} cor="text-emerald-700" />
                <Resumo
                  label="Saldo do período"
                  valor={financeiro.saldoPeriodo}
                  cor={financeiro.saldoPeriodo >= 0 ? "text-emerald-700" : "text-red-700"}
                />
              </div>
            </Card>
          )}

          {servicos && (
            <Card>
              <div className="border-b border-slate-200 px-4 py-3">
                <h2 className="text-sm font-semibold uppercase text-slate-500">{SECAO_LABEL.servicos}</h2>
              </div>
              {servicos.length === 0 ? (
                <div className="p-4">
                  <EmptyState>Nenhuma OS nesse período.</EmptyState>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-2">Número</th>
                        <th className="px-4 py-2">Entrada</th>
                        <th className="px-4 py-2">Cliente</th>
                        <th className="px-4 py-2">Veículo</th>
                        <th className="px-4 py-2">Serviço</th>
                        <th className="px-4 py-2">Valor</th>
                        <th className="px-4 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {servicos.map((os) => (
                        <tr key={`${os.ano}-${os.numero}`}>
                          <td className="px-4 py-2">
                            <Link
                              href={`/ordens-servico`}
                              className="text-amber-700 hover:underline print:text-slate-900 print:no-underline"
                            >
                              {numeroFormatado(os.numero, os.ano)}
                            </Link>
                          </td>
                          <td className="px-4 py-2">{formatarData(os.dataEntrada)}</td>
                          <td className="px-4 py-2">{os.cliente}</td>
                          <td className="px-4 py-2">{os.veiculo}</td>
                          <td className="px-4 py-2">{os.servicos}</td>
                          <td className="px-4 py-2">{formatarMoeda(os.valorTotal)}</td>
                          <td className="px-4 py-2">{STATUS_OS_LABEL[os.status]}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-900 font-semibold">
                        <td className="px-4 py-2" colSpan={5}>
                          Total
                        </td>
                        <td className="px-4 py-2" colSpan={2}>
                          {formatarMoeda(servicos.reduce((s, os) => s + os.valorTotal, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </Card>
          )}

          {oficinas && (
            <Card>
              <div className="border-b border-slate-200 px-4 py-3">
                <h2 className="text-sm font-semibold uppercase text-slate-500">{SECAO_LABEL.oficinas}</h2>
              </div>
              {oficinas.resumoPorOficina.length === 0 ? (
                <div className="p-4">
                  <EmptyState>Nenhum repasse nesse período.</EmptyState>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-2">Oficina</th>
                        <th className="px-4 py-2">Peças</th>
                        <th className="px-4 py-2">Cobrado</th>
                        <th className="px-4 py-2">Custo</th>
                        <th className="px-4 py-2">Lucro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {oficinas.resumoPorOficina.map((r) => (
                        <tr key={r.oficina}>
                          <td className="px-4 py-2">{r.oficina}</td>
                          <td className="px-4 py-2">{r.qtdPecas}</td>
                          <td className="px-4 py-2">{formatarMoeda(r.valorCobrado)}</td>
                          <td className="px-4 py-2">{formatarMoeda(r.custoTotal)}</td>
                          <td className="px-4 py-2 text-emerald-700">{formatarMoeda(r.lucro)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {estoque && (
            <Card>
              <div className="border-b border-slate-200 px-4 py-3">
                <h2 className="text-sm font-semibold uppercase text-slate-500">{SECAO_LABEL.estoque}</h2>
              </div>
              {estoque.length === 0 ? (
                <div className="p-4">
                  <EmptyState>Nenhum item cadastrado no estoque.</EmptyState>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-2">Item</th>
                        <th className="px-4 py-2">Qtd. atual</th>
                        <th className="px-4 py-2">Qtd. mínima</th>
                        <th className="px-4 py-2">Valor em estoque</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {estoque.map((p) => (
                        <tr key={p.nome}>
                          <td className="px-4 py-2">
                            {p.nome} {p.abaixoDoMinimo && <span className="text-red-700">⚠</span>}
                          </td>
                          <td className="px-4 py-2">
                            {p.quantidadeAtual} {p.unidade}
                          </td>
                          <td className="px-4 py-2 text-slate-500">
                            {p.quantidadeMinima} {p.unidade}
                          </td>
                          <td className="px-4 py-2">{formatarMoeda(p.valorEmEstoque)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function Resumo({
  label,
  valor,
  sub,
  cor,
}: {
  label: string;
  valor: number;
  sub?: string;
  cor?: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className={`text-lg font-bold ${cor ?? "text-slate-900"}`}>{formatarMoeda(valor)}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

import { prisma } from "@/lib/prisma";
import { paraNumero } from "@/lib/format";

export const SECOES_RELATORIO = ["financeiro", "servicos", "oficinas", "estoque"] as const;
export type SecaoRelatorio = (typeof SECOES_RELATORIO)[number];

export const SECAO_LABEL: Record<SecaoRelatorio, string> = {
  financeiro: "Faturamento / Financeiro",
  servicos: "Serviços realizados (Ordens de Serviço)",
  oficinas: "Prestadores terceirizados",
  estoque: "Estoque",
};

/** Fim do dia (23:59:59.999) — pra incluir o dia inteiro do filtro "até". */
function fimDoDia(data: Date): Date {
  const d = new Date(data);
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function buscarRelatorioFinanceiro(inicio: Date, fim: Date) {
  const fimAjustado = fimDoDia(fim);

  const [osNoPeriodo, pagamentosNoPeriodo, repassesNoPeriodo, contasPagasNoPeriodo] = await Promise.all([
    prisma.ordemServico.aggregate({
      where: { dataEntrada: { gte: inicio, lte: fimAjustado } },
      _sum: { valorTotal: true },
      _count: true,
    }),
    prisma.pagamento.aggregate({
      where: { data: { gte: inicio, lte: fimAjustado } },
      _sum: { valor: true },
    }),
    prisma.repasseOficina.aggregate({
      where: { dataEntrada: { gte: inicio, lte: fimAjustado } },
      _sum: { custoTotal: true, lucro: true },
    }),
    prisma.contaFinanceira.findMany({
      where: { dataPagamento: { gte: inicio, lte: fimAjustado } },
    }),
  ]);

  const outrasContasPagas = contasPagasNoPeriodo
    .filter((c) => c.tipo === "PAGAR")
    .reduce((s, c) => s + paraNumero(c.valor), 0);
  const outrasContasRecebidas = contasPagasNoPeriodo
    .filter((c) => c.tipo === "RECEBER")
    .reduce((s, c) => s + paraNumero(c.valor), 0);

  const faturado = paraNumero(osNoPeriodo._sum.valorTotal);
  const recebidoClientes = paraNumero(pagamentosNoPeriodo._sum.valor);
  const custoOficinas = paraNumero(repassesNoPeriodo._sum.custoTotal);

  return {
    inicio,
    fim,
    faturado,
    qtdOS: osNoPeriodo._count,
    recebidoClientes,
    custoOficinas,
    lucroRepasses: paraNumero(repassesNoPeriodo._sum.lucro),
    outrasContasPagas,
    outrasContasRecebidas,
    saldoPeriodo: recebidoClientes + outrasContasRecebidas - custoOficinas - outrasContasPagas,
  };
}

export async function buscarRelatorioServicos(inicio: Date, fim: Date, tipoServicoIds?: string[]) {
  const fimAjustado = fimDoDia(fim);

  const ordens = await prisma.ordemServico.findMany({
    where: {
      dataEntrada: { gte: inicio, lte: fimAjustado },
      // Sub-filtro: só entra a OS que tiver pelo menos um item de um dos
      // tipos de serviço marcados (ex: só Martelinho, ou só Pintura).
      ...(tipoServicoIds && tipoServicoIds.length > 0
        ? { itens: { some: { tipoServicoId: { in: tipoServicoIds } } } }
        : {}),
    },
    include: { cliente: true, veiculo: true, itens: true },
    orderBy: { dataEntrada: "asc" },
  });

  return ordens.map((os) => ({
    numero: os.numero,
    ano: os.ano,
    dataEntrada: os.dataEntrada,
    dataSaidaReal: os.dataSaidaReal,
    cliente: os.cliente.nome,
    veiculo: os.veiculo ? `${os.veiculo.modelo}${os.veiculo.placa ? ` (${os.veiculo.placa})` : ""}` : "-",
    servicos: os.itens.map((i) => i.descricao).join(", ") || "-",
    valorTotal: paraNumero(os.valorTotal),
    status: os.status,
  }));
}

export async function buscarRelatorioOficinas(inicio: Date, fim: Date) {
  const fimAjustado = fimDoDia(fim);

  const repasses = await prisma.repasseOficina.findMany({
    where: { dataEntrada: { gte: inicio, lte: fimAjustado } },
    include: { oficina: true },
    orderBy: { dataEntrada: "asc" },
  });

  const porOficina = new Map<
    string,
    { oficina: string; qtdPecas: number; valorCobrado: number; custoTotal: number; lucro: number }
  >();
  for (const r of repasses) {
    const atual = porOficina.get(r.oficina.nome) ?? {
      oficina: r.oficina.nome,
      qtdPecas: 0,
      valorCobrado: 0,
      custoTotal: 0,
      lucro: 0,
    };
    atual.qtdPecas += r.qtdPecas;
    atual.valorCobrado += paraNumero(r.valorCobrado);
    atual.custoTotal += paraNumero(r.custoTotal);
    atual.lucro += paraNumero(r.lucro);
    porOficina.set(r.oficina.nome, atual);
  }

  return {
    resumoPorOficina: Array.from(porOficina.values()),
    repasses: repasses.map((r) => ({
      dataEntrada: r.dataEntrada,
      oficina: r.oficina.nome,
      carro: r.carro,
      placa: r.placa,
      tipoServico: r.tipoServico,
      valorCobrado: paraNumero(r.valorCobrado),
      custoTotal: paraNumero(r.custoTotal),
      lucro: paraNumero(r.lucro),
      status: r.status,
    })),
  };
}

export async function buscarRelatorioEstoque() {
  const pecas = await prisma.peca.findMany({ orderBy: { nome: "asc" } });

  return pecas.map((p) => {
    const quantidadeAtual = paraNumero(p.quantidadeAtual);
    const custoUnitario = paraNumero(p.custoUnitario);
    return {
      nome: p.nome,
      unidade: p.unidade,
      quantidadeAtual,
      quantidadeMinima: paraNumero(p.quantidadeMinima),
      custoUnitario,
      valorEmEstoque: quantidadeAtual * custoUnitario,
      abaixoDoMinimo: quantidadeAtual < paraNumero(p.quantidadeMinima),
    };
  });
}

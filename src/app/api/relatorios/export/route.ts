import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buscarRelatorioEstoque,
  buscarRelatorioFinanceiro,
  buscarRelatorioOficinas,
  buscarRelatorioServicos,
  SECOES_RELATORIO,
  type SecaoRelatorio,
} from "@/lib/relatorios";
import { formatarData, numeroFormatado, STATUS_OS_LABEL } from "@/lib/format";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Não autenticado.", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const inicioStr = searchParams.get("inicio");
  const fimStr = searchParams.get("fim");
  const secoesParam = searchParams.getAll("secoes") as SecaoRelatorio[];
  const secoes = SECOES_RELATORIO.filter((s) => secoesParam.includes(s));

  if (!inicioStr || !fimStr || secoes.length === 0) {
    return new Response("Parâmetros inválidos.", { status: 400 });
  }

  const inicio = new Date(`${inicioStr}T00:00:00`);
  const fim = new Date(`${fimStr}T00:00:00`);

  const empresa = await prisma.empresaConfig.findUnique({ where: { id: 1 } });
  const workbook = new ExcelJS.Workbook();
  workbook.creator = empresa?.nome ?? "BSB Garage Martelinho de Ouro";
  workbook.created = new Date();

  if (secoes.includes("financeiro")) {
    const financeiro = await buscarRelatorioFinanceiro(inicio, fim);
    const sheet = workbook.addWorksheet("Financeiro");
    sheet.columns = [
      { header: "Indicador", key: "indicador", width: 30 },
      { header: "Valor", key: "valor", width: 18 },
    ];
    sheet.addRows([
      { indicador: "Faturado (OS) no período", valor: financeiro.faturado },
      { indicador: "Quantidade de OS", valor: financeiro.qtdOS },
      { indicador: "Recebido de clientes", valor: financeiro.recebidoClientes },
      { indicador: "Pago a prestadores terceirizados", valor: financeiro.custoOficinas },
      { indicador: "Lucro nos repasses às oficinas", valor: financeiro.lucroRepasses },
      { indicador: "Outras contas pagas", valor: financeiro.outrasContasPagas },
      { indicador: "Outras contas recebidas", valor: financeiro.outrasContasRecebidas },
      { indicador: "Saldo do período", valor: financeiro.saldoPeriodo },
    ]);
    sheet.getColumn("valor").numFmt = '"R$"#,##0.00';
    sheet.getRow(1).font = { bold: true };
  }

  if (secoes.includes("servicos")) {
    const servicos = await buscarRelatorioServicos(inicio, fim);
    const sheet = workbook.addWorksheet("Serviços");
    sheet.columns = [
      { header: "Número", key: "numero", width: 12 },
      { header: "Entrada", key: "entrada", width: 12 },
      { header: "Cliente", key: "cliente", width: 25 },
      { header: "Veículo", key: "veiculo", width: 22 },
      { header: "Serviço", key: "servico", width: 40 },
      { header: "Valor", key: "valor", width: 15 },
      { header: "Status", key: "status", width: 16 },
    ];
    for (const os of servicos) {
      sheet.addRow({
        numero: numeroFormatado(os.numero, os.ano),
        entrada: formatarData(os.dataEntrada),
        cliente: os.cliente,
        veiculo: os.veiculo,
        servico: os.servicos,
        valor: os.valorTotal,
        status: STATUS_OS_LABEL[os.status],
      });
    }
    sheet.getColumn("valor").numFmt = '"R$"#,##0.00';
    sheet.getRow(1).font = { bold: true };
  }

  if (secoes.includes("oficinas")) {
    const oficinas = await buscarRelatorioOficinas(inicio, fim);
    const sheet = workbook.addWorksheet("Prestadores terceirizados");
    sheet.columns = [
      { header: "Prestador", key: "oficina", width: 25 },
      { header: "Peças", key: "pecas", width: 10 },
      { header: "Cobrado", key: "cobrado", width: 15 },
      { header: "Custo", key: "custo", width: 15 },
      { header: "Lucro", key: "lucro", width: 15 },
    ];
    for (const r of oficinas.resumoPorOficina) {
      sheet.addRow({
        oficina: r.oficina,
        pecas: r.qtdPecas,
        cobrado: r.valorCobrado,
        custo: r.custoTotal,
        lucro: r.lucro,
      });
    }
    sheet.getColumn("cobrado").numFmt = '"R$"#,##0.00';
    sheet.getColumn("custo").numFmt = '"R$"#,##0.00';
    sheet.getColumn("lucro").numFmt = '"R$"#,##0.00';
    sheet.getRow(1).font = { bold: true };
  }

  if (secoes.includes("estoque")) {
    const estoque = await buscarRelatorioEstoque();
    const sheet = workbook.addWorksheet("Estoque");
    sheet.columns = [
      { header: "Item", key: "item", width: 28 },
      { header: "Qtd. atual", key: "qtdAtual", width: 12 },
      { header: "Unidade", key: "unidade", width: 10 },
      { header: "Qtd. mínima", key: "qtdMinima", width: 12 },
      { header: "Valor em estoque", key: "valor", width: 18 },
      { header: "Abaixo do mínimo?", key: "alerta", width: 16 },
    ];
    for (const p of estoque) {
      sheet.addRow({
        item: p.nome,
        qtdAtual: p.quantidadeAtual,
        unidade: p.unidade,
        qtdMinima: p.quantidadeMinima,
        valor: p.valorEmEstoque,
        alerta: p.abaixoDoMinimo ? "Sim" : "Não",
      });
    }
    sheet.getColumn("valor").numFmt = '"R$"#,##0.00';
    sheet.getRow(1).font = { bold: true };
  }

  if (workbook.worksheets.length === 0) {
    return new Response("Nenhuma seção selecionada.", { status: 400 });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const nomeArquivo = `relatorio-bsb-garage-${inicioStr}-a-${fimStr}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
    },
  });
}

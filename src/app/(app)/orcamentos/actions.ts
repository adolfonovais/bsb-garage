"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, TX_OPTIONS } from "@/lib/prisma";
import { organizacaoIdAtual } from "@/lib/tenant";
import { auth } from "@/lib/auth";
import { parseItens, somaItens } from "@/lib/itens";
import { proximoNumero } from "@/lib/numero";
import { formatarMoeda, numeroFormatado } from "@/lib/format";
import { registrarExclusao } from "@/lib/exclusoes";
import { sincronizarItensDaOS } from "@/lib/sincronizar-itens-os";
import { enviarPdfPorWhatsApp, type EstadoEnvioWhatsApp } from "@/lib/envio-documentos-whatsapp";
import { WHATSAPP_TEMPLATES } from "@/lib/whatsapp";

const OrcamentoSchema = z.object({
  clienteId: z.string().min(1, "Selecione o cliente."),
  veiculoId: z.string().min(1, "Não é possível salvar o orçamento sem veículo. Selecione o veículo do cliente (se ele ainda não tem, cadastre na página do cliente)."),
  validadeDias: z.string().optional(),
  observacoes: z.string().optional(),
});

export type EstadoOrcamento = { erro?: string } | undefined;

// Problemas de validação voltam como aviso na própria tela (não como página de erro).
export async function criarOrcamento(_prevState: EstadoOrcamento, formData: FormData): Promise<EstadoOrcamento> {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const parsed = OrcamentoSchema.safeParse({
    clienteId: formData.get("clienteId"),
    veiculoId: formData.get("veiculoId"),
    validadeDias: formData.get("validadeDias"),
    observacoes: formData.get("observacoes"),
  });
  if (!parsed.success) return { erro: parsed.error.issues[0].message };
  const dados = parsed.data;
  const veiculoDoCliente = await prisma.veiculo.findFirst({
    where: { id: dados.veiculoId, clienteId: dados.clienteId },
    select: { id: true },
  });
  if (!veiculoDoCliente) return { erro: "O veículo escolhido não pertence a esse cliente." };
  const itens = parseItens(formData);
  const total = somaItens(itens);
  const ano = new Date().getFullYear();

  const orcamento = await prisma.$transaction(async (tx) => {
    const numero = await proximoNumero("ORCAMENTO", ano, tx);
    return tx.orcamento.create({
      data: {
      organizacaoId: await organizacaoIdAtual(),
        numero,
        ano,
        clienteId: dados.clienteId,
        veiculoId: dados.veiculoId,
        validadeDias: dados.validadeDias ? Number(dados.validadeDias) : 60,
        observacoes: dados.observacoes || null,
        valorTotal: total,
        criadoPorId: session.user.id,
        itens: {
          create: itens.map((item) => ({
            descricao: item.descricao,
            quantidade: item.quantidade,
            valorUnit: item.valorUnit,
            valorTotal: item.valorTotal,
            ordem: item.ordem,
            tipoServicoId: item.tipoServicoId,
          })),
        },
      },
    });
  }, TX_OPTIONS);

  revalidatePath("/orcamentos");
  redirect(`/orcamentos/${orcamento.id}`);
}

export async function atualizarOrcamento(
  orcamentoId: string,
  _prevState: EstadoOrcamento,
  formData: FormData
): Promise<EstadoOrcamento> {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const parsed = OrcamentoSchema.safeParse({
    clienteId: formData.get("clienteId"),
    veiculoId: formData.get("veiculoId"),
    validadeDias: formData.get("validadeDias"),
    observacoes: formData.get("observacoes"),
  });
  if (!parsed.success) return { erro: parsed.error.issues[0].message };
  const dados = parsed.data;
  const veiculoDoCliente = await prisma.veiculo.findFirst({
    where: { id: dados.veiculoId, clienteId: dados.clienteId },
    select: { id: true },
  });
  if (!veiculoDoCliente) return { erro: "O veículo escolhido não pertence a esse cliente." };
  const itens = parseItens(formData);
  const total = somaItens(itens);

  const osVinculadaId = await prisma.$transaction(async (tx) => {
    await tx.orcamentoItem.deleteMany({ where: { orcamentoId } });
    await tx.orcamento.update({
      where: { id: orcamentoId },
      data: {
        clienteId: dados.clienteId,
        veiculoId: dados.veiculoId,
        validadeDias: dados.validadeDias ? Number(dados.validadeDias) : 60,
        observacoes: dados.observacoes || null,
        valorTotal: total,
        itens: {
          create: itens.map((item) => ({
            descricao: item.descricao,
            quantidade: item.quantidade,
            valorUnit: item.valorUnit,
            valorTotal: item.valorTotal,
            ordem: item.ordem,
            tipoServicoId: item.tipoServicoId,
          })),
        },
      },
    });

    // Se esse orçamento já foi convertido em OS, propaga a edição pra ela
    // também — os dois devem representar o mesmo serviço.
    const osVinculada = await tx.ordemServico.findFirst({ where: { origemOrcamentoId: orcamentoId } });
    if (osVinculada) {
      await sincronizarItensDaOS(tx, osVinculada.id, itens);
      await tx.ordemServico.update({
        where: { id: osVinculada.id },
        data: {
          clienteId: dados.clienteId,
          veiculoId: dados.veiculoId,
          observacoes: dados.observacoes || null,
          valorTotal: total,
        },
      });
    }

    return osVinculada?.id ?? null;
  }, TX_OPTIONS);

  revalidatePath(`/orcamentos/${orcamentoId}`);
  revalidatePath("/orcamentos");
  if (osVinculadaId) {
    revalidatePath(`/ordens-servico/${osVinculadaId}`);
    revalidatePath("/ordens-servico");
  }
  redirect(`/orcamentos/${orcamentoId}`);
}

export async function atualizarStatusOrcamento(orcamentoId: string, status: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  await prisma.orcamento.update({
    where: { id: orcamentoId },
    data: { status: status as never },
  });
  revalidatePath(`/orcamentos/${orcamentoId}`);
  revalidatePath("/orcamentos");
}

export async function excluirOrcamento(orcamentoId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const orcamento = await prisma.orcamento.findUnique({
    where: { id: orcamentoId },
    include: { cliente: { select: { nome: true } }, veiculo: true, itens: true },
  });

  await prisma.orcamento.delete({ where: { id: orcamentoId } });

  if (orcamento) {
    await registrarExclusao({
      tipo: "ORCAMENTO",
      referencia: `Orçamento ${numeroFormatado(orcamento.numero, orcamento.ano)}`,
      resumo: `${orcamento.cliente?.nome ?? "-"} · ${formatarMoeda(orcamento.valorTotal)}`,
      dados: orcamento,
    });
  }
  revalidatePath("/orcamentos");
  redirect("/orcamentos");
}

export async function converterEmOS(orcamentoId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const ano = new Date().getFullYear();

  const os = await prisma.$transaction(async (tx) => {
    const orcamento = await tx.orcamento.findUniqueOrThrow({
      where: { id: orcamentoId },
      include: { itens: true },
    });

    if (!orcamento.veiculoId) {
      throw new Error("Escolha o veículo no orçamento antes de converter em Ordem de Serviço.");
    }

    const numero = await proximoNumero("OS", ano, tx);

    const novaOS = await tx.ordemServico.create({
      data: {
      organizacaoId: await organizacaoIdAtual(),
        numero,
        ano,
        origemOrcamentoId: orcamento.id,
        clienteId: orcamento.clienteId,
        veiculoId: orcamento.veiculoId,
        valorTotal: orcamento.valorTotal,
        observacoes: orcamento.observacoes,
        criadoPorId: session.user.id,
        itens: {
          create: orcamento.itens.map((item) => ({
            descricao: item.descricao,
            quantidade: item.quantidade,
            valorUnit: item.valorUnit,
            valorTotal: item.valorTotal,
            ordem: item.ordem,
            tipoServicoId: item.tipoServicoId,
          })),
        },
      },
    });

    await tx.orcamento.update({ where: { id: orcamento.id }, data: { status: "APROVADO" } });

    return novaOS;
  }, TX_OPTIONS);

  revalidatePath("/orcamentos");
  revalidatePath("/ordens-servico");
  redirect(`/ordens-servico/${os.id}`);
}

export async function enviarOrcamentoPorWhatsApp(orcamentoId: string, _prevState: EstadoEnvioWhatsApp, _formData: FormData): Promise<EstadoEnvioWhatsApp> {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const orcamento = await prisma.orcamento.findUniqueOrThrow({
    where: { id: orcamentoId },
    select: { numero: true, ano: true, cliente: { select: { id: true, nome: true, telefone: true } } },
  });
  const numeroOrcamento = numeroFormatado(orcamento.numero, orcamento.ano);

  return enviarPdfPorWhatsApp({
    doc: "orcamento",
    id: orcamentoId,
    caminhoImpressao: `/imprimir/orcamento/${orcamentoId}`,
    nomeArquivo: `Orcamento-${numeroOrcamento}.pdf`,
    template: process.env.WHATSAPP_TEMPLATE_ENVIO_ORCAMENTO || WHATSAPP_TEMPLATES.envioOrcamento,
    telefone: orcamento.cliente.telefone,
    nomeCliente: orcamento.cliente.nome,
    numeroDocumento: numeroOrcamento,
    clienteId: orcamento.cliente.id,
  });
}

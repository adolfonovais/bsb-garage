"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, TX_OPTIONS } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { parseItens, somaItens } from "@/lib/itens";
import { proximoNumero } from "@/lib/numero";

const OrcamentoSchema = z.object({
  clienteId: z.string().min(1, "Selecione o cliente."),
  veiculoId: z.string().optional(),
  validadeDias: z.string().optional(),
  observacoes: z.string().optional(),
});

export async function criarOrcamento(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const dados = OrcamentoSchema.parse({
    clienteId: formData.get("clienteId"),
    veiculoId: formData.get("veiculoId"),
    validadeDias: formData.get("validadeDias"),
    observacoes: formData.get("observacoes"),
  });
  const itens = parseItens(formData);
  const total = somaItens(itens);
  const ano = new Date().getFullYear();

  const orcamento = await prisma.$transaction(async (tx) => {
    const numero = await proximoNumero("ORCAMENTO", ano, tx);
    return tx.orcamento.create({
      data: {
        numero,
        ano,
        clienteId: dados.clienteId,
        veiculoId: dados.veiculoId || null,
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

export async function atualizarOrcamento(orcamentoId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const dados = OrcamentoSchema.parse({
    clienteId: formData.get("clienteId"),
    veiculoId: formData.get("veiculoId"),
    validadeDias: formData.get("validadeDias"),
    observacoes: formData.get("observacoes"),
  });
  const itens = parseItens(formData);
  const total = somaItens(itens);

  const osVinculadaId = await prisma.$transaction(async (tx) => {
    await tx.orcamentoItem.deleteMany({ where: { orcamentoId } });
    await tx.orcamento.update({
      where: { id: orcamentoId },
      data: {
        clienteId: dados.clienteId,
        veiculoId: dados.veiculoId || null,
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
      await tx.ordemServicoItem.deleteMany({ where: { osId: osVinculada.id } });
      await tx.ordemServico.update({
        where: { id: osVinculada.id },
        data: {
          clienteId: dados.clienteId,
          veiculoId: dados.veiculoId || null,
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

  await prisma.orcamento.delete({ where: { id: orcamentoId } });
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

    const numero = await proximoNumero("OS", ano, tx);

    const novaOS = await tx.ordemServico.create({
      data: {
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

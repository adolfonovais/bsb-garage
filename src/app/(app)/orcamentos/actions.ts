"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
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
        validadeDias: dados.validadeDias ? Number(dados.validadeDias) : 30,
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
  });

  revalidatePath("/orcamentos");
  redirect(`/orcamentos/${orcamento.id}`);
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
  });

  revalidatePath("/orcamentos");
  revalidatePath("/ordens-servico");
  redirect(`/ordens-servico/${os.id}`);
}

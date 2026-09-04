"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, TX_OPTIONS } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { dataDoFormulario } from "@/lib/format";

const PecaSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da peça/material."),
  unidade: z.string().trim().min(1, "Informe a unidade."),
  quantidadeMinima: z.string().nullable().optional(),
  custoUnitario: z.string().nullable().optional(),
  // Só existe no formulário de criação — no de edição o campo nem aparece,
  // e aí .get() volta `null` em vez de `undefined`.
  quantidadeInicial: z.string().nullable().optional(),
});

export async function criarPeca(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const dados = PecaSchema.parse({
    nome: formData.get("nome"),
    unidade: formData.get("unidade"),
    quantidadeMinima: formData.get("quantidadeMinima"),
    custoUnitario: formData.get("custoUnitario"),
    quantidadeInicial: formData.get("quantidadeInicial"),
  });

  const quantidadeInicial = Number(dados.quantidadeInicial) || 0;

  const peca = await prisma.peca.create({
    data: {
      nome: dados.nome,
      unidade: dados.unidade,
      quantidadeMinima: Number(dados.quantidadeMinima) || 0,
      custoUnitario: dados.custoUnitario ? Number(dados.custoUnitario) : null,
      quantidadeAtual: quantidadeInicial,
      movimentacoes:
        quantidadeInicial > 0
          ? {
              create: {
                tipo: "ENTRADA",
                quantidade: quantidadeInicial,
                observacao: "Estoque inicial",
              },
            }
          : undefined,
    },
  });

  revalidatePath("/estoque");
  redirect(`/estoque/${peca.id}`);
}

export async function atualizarPeca(
  pecaId: string,
  _estado: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const dados = PecaSchema.parse({
    nome: formData.get("nome"),
    unidade: formData.get("unidade"),
    quantidadeMinima: formData.get("quantidadeMinima"),
    custoUnitario: formData.get("custoUnitario"),
    quantidadeInicial: formData.get("quantidadeInicial"),
  });

  await prisma.peca.update({
    where: { id: pecaId },
    data: {
      nome: dados.nome,
      unidade: dados.unidade,
      quantidadeMinima: Number(dados.quantidadeMinima) || 0,
      custoUnitario: dados.custoUnitario ? Number(dados.custoUnitario) : null,
    },
  });

  revalidatePath("/estoque");
  revalidatePath(`/estoque/${pecaId}`);
  return { sucesso: true };
}

export async function excluirPeca(pecaId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  await prisma.peca.delete({ where: { id: pecaId } });
  revalidatePath("/estoque");
  redirect("/estoque");
}

const MovimentacaoSchema = z.object({
  tipo: z.enum(["ENTRADA", "SAIDA"]),
  quantidade: z.string().min(1, "Informe a quantidade."),
  data: z.string().optional(),
  observacao: z.string().trim().optional(),
});

export type EstadoFormulario = { sucesso?: boolean } | undefined;

export async function registrarMovimentacao(
  pecaId: string,
  _prevState: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const dados = MovimentacaoSchema.parse({
    tipo: formData.get("tipo"),
    quantidade: formData.get("quantidade"),
    data: formData.get("data"),
    observacao: formData.get("observacao"),
  });

  const quantidade = Number(dados.quantidade) || 0;
  const delta = dados.tipo === "ENTRADA" ? quantidade : -quantidade;

  await prisma.$transaction([
    prisma.movimentacaoEstoque.create({
      data: {
        pecaId,
        tipo: dados.tipo,
        quantidade,
        data: dataDoFormulario(dados.data) ?? new Date(),
        observacao: dados.observacao || null,
      },
    }),
    prisma.peca.update({
      where: { id: pecaId },
      data: { quantidadeAtual: { increment: delta } },
    }),
  ], TX_OPTIONS);

  revalidatePath(`/estoque/${pecaId}`);
  revalidatePath("/estoque");
  return { sucesso: true };
}

export async function excluirMovimentacao(pecaId: string, movimentacaoId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const mov = await prisma.movimentacaoEstoque.findUniqueOrThrow({ where: { id: movimentacaoId } });
  const delta = mov.tipo === "ENTRADA" ? -Number(mov.quantidade) : Number(mov.quantidade);

  await prisma.$transaction([
    prisma.movimentacaoEstoque.delete({ where: { id: movimentacaoId } }),
    prisma.peca.update({
      where: { id: pecaId },
      data: { quantidadeAtual: { increment: delta } },
    }),
  ], TX_OPTIONS);

  revalidatePath(`/estoque/${pecaId}`);
  revalidatePath("/estoque");
}

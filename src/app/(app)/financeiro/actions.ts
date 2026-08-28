"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { dataDoFormulario } from "@/lib/format";

const ContaSchema = z.object({
  tipo: z.enum(["PAGAR", "RECEBER"]),
  descricao: z.string().trim().min(2, "Informe a descrição."),
  valor: z.string().min(1, "Informe o valor."),
  dataVencimento: z.string().min(1, "Informe o vencimento."),
  categoria: z.string().trim().optional(),
});

export async function criarConta(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const dados = ContaSchema.parse({
    tipo: formData.get("tipo"),
    descricao: formData.get("descricao"),
    valor: formData.get("valor"),
    dataVencimento: formData.get("dataVencimento"),
    categoria: formData.get("categoria"),
  });

  await prisma.contaFinanceira.create({
    data: {
      tipo: dados.tipo,
      descricao: dados.descricao,
      valor: Number(dados.valor) || 0,
      dataVencimento: dataDoFormulario(dados.dataVencimento) ?? new Date(),
      categoria: dados.categoria || null,
    },
  });
  revalidatePath("/financeiro");
}

export async function marcarContaPaga(contaId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  await prisma.contaFinanceira.update({
    where: { id: contaId },
    data: { status: "PAGA", dataPagamento: new Date() },
  });
  revalidatePath("/financeiro");
}

export async function reabrirConta(contaId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  await prisma.contaFinanceira.update({
    where: { id: contaId },
    data: { status: "ABERTA", dataPagamento: null },
  });
  revalidatePath("/financeiro");
}

export async function excluirConta(contaId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  await prisma.contaFinanceira.delete({ where: { id: contaId } });
  revalidatePath("/financeiro");
}

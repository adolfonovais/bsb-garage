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
  // Checkbox desmarcado não é enviado no FormData — o navegador manda
  // `null`, não `undefined`, então precisa aceitar os dois.
  recorrente: z.string().nullable().optional(),
});

function proximoMes(data: Date): Date {
  const proxima = new Date(data);
  proxima.setMonth(proxima.getMonth() + 1);
  return proxima;
}

export type EstadoFormulario = { sucesso?: boolean } | undefined;

export async function criarConta(_prevState: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const dados = ContaSchema.parse({
    tipo: formData.get("tipo"),
    descricao: formData.get("descricao"),
    valor: formData.get("valor"),
    dataVencimento: formData.get("dataVencimento"),
    categoria: formData.get("categoria"),
    recorrente: formData.get("recorrente"),
  });

  await prisma.contaFinanceira.create({
    data: {
      tipo: dados.tipo,
      descricao: dados.descricao,
      valor: Number(dados.valor) || 0,
      dataVencimento: dataDoFormulario(dados.dataVencimento) ?? new Date(),
      categoria: dados.categoria || null,
      recorrente: dados.recorrente === "on",
    },
  });
  revalidatePath("/financeiro");
  return { sucesso: true };
}

export async function atualizarConta(
  contaId: string,
  _prevState: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const dados = ContaSchema.parse({
    tipo: formData.get("tipo"),
    descricao: formData.get("descricao"),
    valor: formData.get("valor"),
    dataVencimento: formData.get("dataVencimento"),
    categoria: formData.get("categoria"),
    recorrente: formData.get("recorrente"),
  });

  await prisma.contaFinanceira.update({
    where: { id: contaId },
    data: {
      descricao: dados.descricao,
      valor: Number(dados.valor) || 0,
      dataVencimento: dataDoFormulario(dados.dataVencimento) ?? new Date(),
      categoria: dados.categoria || null,
      recorrente: dados.recorrente === "on",
    },
  });
  revalidatePath("/financeiro");
  return { sucesso: true };
}

export async function marcarContaPaga(contaId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const conta = await prisma.contaFinanceira.update({
    where: { id: contaId },
    data: { status: "PAGA", dataPagamento: new Date() },
  });

  // Conta recorrente: ao pagar, já gera a próxima ocorrência (1 mês depois),
  // pra não precisar recadastrar toda vez (ex: aluguel, assinatura).
  if (conta.recorrente) {
    await prisma.contaFinanceira.create({
      data: {
        tipo: conta.tipo,
        descricao: conta.descricao,
        valor: conta.valor,
        dataVencimento: proximoMes(conta.dataVencimento),
        categoria: conta.categoria,
        recorrente: true,
      },
    });
  }

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

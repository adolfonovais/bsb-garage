"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { parseItens, somaItens } from "@/lib/itens";
import { proximoNumero } from "@/lib/numero";
import { dataDoFormulario } from "@/lib/format";

const OSSchema = z.object({
  clienteId: z.string().min(1, "Selecione o cliente."),
  veiculoId: z.string().optional(),
  dataEntrada: z.string().optional(),
  dataSaidaPrevista: z.string().optional(),
  formaPagamento: z.string().optional(),
  observacoes: z.string().optional(),
});

export async function criarOS(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const dados = OSSchema.parse({
    clienteId: formData.get("clienteId"),
    veiculoId: formData.get("veiculoId"),
    dataEntrada: formData.get("dataEntrada"),
    dataSaidaPrevista: formData.get("dataSaidaPrevista"),
    formaPagamento: formData.get("formaPagamento"),
    observacoes: formData.get("observacoes"),
  });
  const itens = parseItens(formData);
  const total = somaItens(itens);
  const ano = new Date().getFullYear();

  const os = await prisma.$transaction(async (tx) => {
    const numero = await proximoNumero("OS", ano, tx);
    return tx.ordemServico.create({
      data: {
        numero,
        ano,
        clienteId: dados.clienteId,
        veiculoId: dados.veiculoId || null,
        dataEntrada: dataDoFormulario(dados.dataEntrada) ?? new Date(),
        dataSaidaPrevista: dataDoFormulario(dados.dataSaidaPrevista),
        formaPagamento: dados.formaPagamento || null,
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

  revalidatePath("/ordens-servico");
  redirect(`/ordens-servico/${os.id}`);
}

export async function atualizarStatusOS(osId: string, status: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  await prisma.ordemServico.update({
    where: { id: osId },
    data: {
      status: status as never,
      dataSaidaReal: status === "ENTREGUE" ? new Date() : undefined,
    },
  });
  revalidatePath(`/ordens-servico/${osId}`);
  revalidatePath("/ordens-servico");
}

export async function excluirOS(osId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  await prisma.ordemServico.delete({ where: { id: osId } });
  revalidatePath("/ordens-servico");
  redirect("/ordens-servico");
}

const PagamentoSchema = z.object({
  data: z.string().optional(),
  descricao: z.string().optional(),
  valor: z.string().min(1, "Informe o valor recebido."),
  formaPagamento: z.string().optional(),
});

export async function registrarPagamento(osId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const dados = PagamentoSchema.parse({
    data: formData.get("data"),
    descricao: formData.get("descricao"),
    valor: formData.get("valor"),
    formaPagamento: formData.get("formaPagamento"),
  });

  await prisma.pagamento.create({
    data: {
      osId,
      data: dataDoFormulario(dados.data) ?? new Date(),
      descricao: dados.descricao || null,
      valor: Number(dados.valor),
      formaPagamento: dados.formaPagamento || null,
    },
  });
  revalidatePath(`/ordens-servico/${osId}`);
}

export async function excluirPagamento(osId: string, pagamentoId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  await prisma.pagamento.delete({ where: { id: pagamentoId } });
  revalidatePath(`/ordens-servico/${osId}`);
}

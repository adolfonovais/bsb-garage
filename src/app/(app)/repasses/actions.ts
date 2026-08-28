"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { dataDoFormulario } from "@/lib/format";

const RepasseSchema = z.object({
  oficinaId: z.string().min(1, "Selecione a oficina."),
  osId: z.string().optional(),
  dataEntrada: z.string().min(1, "Informe a data de entrada."),
  dataSaida: z.string().optional(),
  carro: z.string().trim().optional(),
  placa: z.string().trim().optional(),
  tipoServico: z.string().trim().min(1, "Informe o tipo de serviço."),
  qtdPecas: z.string().optional(),
  servicoAdicional: z.string().trim().optional(),
  valorCobrado: z.string().min(1, "Informe o valor cobrado do cliente."),
  custoOficina: z.string().min(1, "Informe o custo cobrado pela oficina."),
  outrosCustos: z.string().optional(),
  // Checkbox desmarcado não é enviado no FormData — o navegador manda `null`,
  // não `undefined`, então precisa aceitar os dois.
  polimento: z.string().nullable().optional(),
});

function calcularCustoELucro(custoOficina: number, outrosCustos: number, valorCobrado: number) {
  const custoTotal = Math.round((custoOficina + outrosCustos) * 100) / 100;
  const lucro = Math.round((valorCobrado - custoTotal) * 100) / 100;
  return { custoTotal, lucro };
}

export async function criarRepasse(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const dados = RepasseSchema.parse({
    oficinaId: formData.get("oficinaId"),
    osId: formData.get("osId"),
    dataEntrada: formData.get("dataEntrada"),
    dataSaida: formData.get("dataSaida"),
    carro: formData.get("carro"),
    placa: formData.get("placa"),
    tipoServico: formData.get("tipoServico"),
    qtdPecas: formData.get("qtdPecas"),
    servicoAdicional: formData.get("servicoAdicional"),
    valorCobrado: formData.get("valorCobrado"),
    custoOficina: formData.get("custoOficina"),
    outrosCustos: formData.get("outrosCustos"),
    polimento: formData.get("polimento"),
  });

  const valorCobrado = Number(dados.valorCobrado) || 0;
  const custoOficina = Number(dados.custoOficina) || 0;
  const outrosCustos = Number(dados.outrosCustos) || 0;
  const { custoTotal, lucro } = calcularCustoELucro(custoOficina, outrosCustos, valorCobrado);

  let carro = dados.carro || "";
  let placa = dados.placa || "";
  if (!carro && dados.osId) {
    const os = await prisma.ordemServico.findUnique({
      where: { id: dados.osId },
      include: { veiculo: true },
    });
    if (os?.veiculo) {
      carro = os.veiculo.modelo;
      placa = placa || os.veiculo.placa || "";
    }
  }
  if (!carro) {
    throw new Error("Informe o carro, ou vincule a uma OS com veículo cadastrado.");
  }

  const repasse = await prisma.repasseOficina.create({
    data: {
      oficinaId: dados.oficinaId,
      osId: dados.osId || null,
      dataEntrada: dataDoFormulario(dados.dataEntrada) ?? new Date(),
      dataSaida: dataDoFormulario(dados.dataSaida),
      carro,
      placa: placa.toUpperCase() || null,
      tipoServico: dados.tipoServico,
      qtdPecas: dados.qtdPecas ? Number(dados.qtdPecas) : 1,
      servicoAdicional: dados.servicoAdicional || null,
      valorCobrado,
      custoOficina,
      outrosCustos: outrosCustos || null,
      polimento: dados.polimento === "on",
      custoTotal,
      lucro,
    },
  });

  revalidatePath("/repasses");
  revalidatePath("/oficinas");
  revalidatePath(`/oficinas/${dados.oficinaId}`);
  redirect(`/repasses/${repasse.id}`);
}

export async function atualizarRepasse(repasseId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const dados = RepasseSchema.parse({
    oficinaId: formData.get("oficinaId"),
    osId: formData.get("osId"),
    dataEntrada: formData.get("dataEntrada"),
    dataSaida: formData.get("dataSaida"),
    carro: formData.get("carro"),
    placa: formData.get("placa"),
    tipoServico: formData.get("tipoServico"),
    qtdPecas: formData.get("qtdPecas"),
    servicoAdicional: formData.get("servicoAdicional"),
    valorCobrado: formData.get("valorCobrado"),
    custoOficina: formData.get("custoOficina"),
    outrosCustos: formData.get("outrosCustos"),
    polimento: formData.get("polimento"),
  });

  const valorCobrado = Number(dados.valorCobrado) || 0;
  const custoOficina = Number(dados.custoOficina) || 0;
  const outrosCustos = Number(dados.outrosCustos) || 0;
  const { custoTotal, lucro } = calcularCustoELucro(custoOficina, outrosCustos, valorCobrado);

  if (!dados.carro) {
    throw new Error("Informe o carro.");
  }

  await prisma.repasseOficina.update({
    where: { id: repasseId },
    data: {
      oficinaId: dados.oficinaId,
      osId: dados.osId || null,
      dataEntrada: dataDoFormulario(dados.dataEntrada) ?? new Date(),
      dataSaida: dataDoFormulario(dados.dataSaida),
      carro: dados.carro,
      placa: dados.placa?.toUpperCase() || null,
      tipoServico: dados.tipoServico,
      qtdPecas: dados.qtdPecas ? Number(dados.qtdPecas) : 1,
      servicoAdicional: dados.servicoAdicional || null,
      valorCobrado,
      custoOficina,
      outrosCustos: outrosCustos || null,
      polimento: dados.polimento === "on",
      custoTotal,
      lucro,
    },
  });

  revalidatePath("/repasses");
  revalidatePath(`/repasses/${repasseId}`);
  revalidatePath("/oficinas");
}

export async function atualizarStatusRepasse(repasseId: string, status: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  await prisma.repasseOficina.update({ where: { id: repasseId }, data: { status: status as never } });
  revalidatePath(`/repasses/${repasseId}`);
  revalidatePath("/repasses");
}

export async function atualizarStatusPagamentoOficina(repasseId: string, status: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  await prisma.repasseOficina.update({
    where: { id: repasseId },
    data: { statusPagamentoOficina: status as never },
  });
  revalidatePath(`/repasses/${repasseId}`);
  revalidatePath("/repasses");
  revalidatePath("/financeiro");
}

export async function excluirRepasse(repasseId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  await prisma.repasseOficina.delete({ where: { id: repasseId } });
  revalidatePath("/repasses");
  revalidatePath("/oficinas");
  redirect("/repasses");
}

"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const ClienteSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do cliente."),
  cpf: z.string().trim().optional(),
  telefone: z.string().trim().optional(),
  email: z.string().trim().optional(),
  // Endereço estruturado — usado na emissão de NFS-e pelo webservice do DF.
  cep: z.string().trim().optional(),
  logradouro: z.string().trim().optional(),
  numero: z.string().trim().optional(),
  bairro: z.string().trim().optional(),
  cidade: z.string().trim().optional(),
  uf: z.string().trim().optional(),
});

export async function criarCliente(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const dados = ClienteSchema.parse({
    nome: formData.get("nome"),
    cpf: formData.get("cpf"),
    telefone: formData.get("telefone"),
    email: formData.get("email"),
    cep: formData.get("cep"),
    logradouro: formData.get("logradouro"),
    numero: formData.get("numero"),
    bairro: formData.get("bairro"),
    cidade: formData.get("cidade"),
    uf: formData.get("uf"),
  });

  const cliente = await prisma.cliente.create({ data: dados });
  revalidatePath("/clientes");
  redirect(`/clientes/${cliente.id}`);
}

export async function atualizarCliente(clienteId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const dados = ClienteSchema.parse({
    nome: formData.get("nome"),
    cpf: formData.get("cpf"),
    telefone: formData.get("telefone"),
    email: formData.get("email"),
    cep: formData.get("cep"),
    logradouro: formData.get("logradouro"),
    numero: formData.get("numero"),
    bairro: formData.get("bairro"),
    cidade: formData.get("cidade"),
    uf: formData.get("uf"),
  });

  await prisma.cliente.update({ where: { id: clienteId }, data: dados });
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clienteId}`);
}

export async function excluirCliente(clienteId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  await prisma.cliente.delete({ where: { id: clienteId } });
  revalidatePath("/clientes");
  redirect("/clientes");
}

const VeiculoSchema = z.object({
  modelo: z.string().trim().min(1, "Informe o modelo do veículo."),
  placa: z.string().trim().optional(),
  cor: z.string().trim().optional(),
  ano: z.string().trim().optional(),
});

export type VeiculoState = { sucesso?: boolean } | undefined;

export async function criarVeiculo(
  clienteId: string,
  _prevState: VeiculoState,
  formData: FormData
): Promise<VeiculoState> {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const dados = VeiculoSchema.parse({
    modelo: formData.get("modelo"),
    placa: formData.get("placa"),
    cor: formData.get("cor"),
    ano: formData.get("ano"),
  });

  await prisma.veiculo.create({
    data: {
      clienteId,
      modelo: dados.modelo,
      placa: dados.placa?.toUpperCase() || null,
      cor: dados.cor || null,
      ano: dados.ano ? Number(dados.ano) : null,
    },
  });
  revalidatePath(`/clientes/${clienteId}`);
  return { sucesso: true };
}

export async function atualizarVeiculo(
  clienteId: string,
  veiculoId: string,
  _prevState: VeiculoState,
  formData: FormData
): Promise<VeiculoState> {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const dados = VeiculoSchema.parse({
    modelo: formData.get("modelo"),
    placa: formData.get("placa"),
    cor: formData.get("cor"),
    ano: formData.get("ano"),
  });

  await prisma.veiculo.update({
    where: { id: veiculoId },
    data: {
      modelo: dados.modelo,
      placa: dados.placa?.toUpperCase() || null,
      cor: dados.cor || null,
      ano: dados.ano ? Number(dados.ano) : null,
    },
  });
  revalidatePath(`/clientes/${clienteId}`);
  return { sucesso: true };
}

export async function excluirVeiculo(clienteId: string, veiculoId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  await prisma.veiculo.delete({ where: { id: veiculoId } });
  revalidatePath(`/clientes/${clienteId}`);
}

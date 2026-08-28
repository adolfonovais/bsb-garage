"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const ClienteSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do cliente."),
  telefone: z.string().trim().optional(),
  email: z.string().trim().optional(),
  endereco: z.string().trim().optional(),
});

export async function criarCliente(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const dados = ClienteSchema.parse({
    nome: formData.get("nome"),
    telefone: formData.get("telefone"),
    email: formData.get("email"),
    endereco: formData.get("endereco"),
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
    telefone: formData.get("telefone"),
    email: formData.get("email"),
    endereco: formData.get("endereco"),
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

export async function criarVeiculo(clienteId: string, formData: FormData) {
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
}

export async function excluirVeiculo(clienteId: string, veiculoId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  await prisma.veiculo.delete({ where: { id: veiculoId } });
  revalidatePath(`/clientes/${clienteId}`);
}

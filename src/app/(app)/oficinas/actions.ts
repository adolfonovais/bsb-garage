"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { EstadoFormulario } from "@/components/EdicaoInline";

const OficinaSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da oficina."),
  contato: z.string().trim().optional(),
  telefone: z.string().trim().optional(),
});

export async function criarOficina(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const dados = OficinaSchema.parse({
    nome: formData.get("nome"),
    contato: formData.get("contato"),
    telefone: formData.get("telefone"),
  });

  const oficina = await prisma.oficinaTerceirizada.create({
    data: {
      nome: dados.nome,
      contato: dados.contato || null,
      telefone: dados.telefone || null,
    },
  });

  revalidatePath("/oficinas");
  redirect(`/oficinas/${oficina.id}`);
}

export async function atualizarOficina(
  oficinaId: string,
  _estado: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const dados = OficinaSchema.parse({
    nome: formData.get("nome"),
    contato: formData.get("contato"),
    telefone: formData.get("telefone"),
  });

  await prisma.oficinaTerceirizada.update({
    where: { id: oficinaId },
    data: {
      nome: dados.nome,
      contato: dados.contato || null,
      telefone: dados.telefone || null,
    },
  });
  revalidatePath("/oficinas");
  revalidatePath(`/oficinas/${oficinaId}`);
  return { sucesso: true };
}

export async function alternarAtivoOficina(oficinaId: string, ativo: boolean) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  await prisma.oficinaTerceirizada.update({ where: { id: oficinaId }, data: { ativo } });
  revalidatePath("/oficinas");
  revalidatePath(`/oficinas/${oficinaId}`);
}

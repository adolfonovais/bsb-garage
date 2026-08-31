"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function exigirAdmin() {
  const session = await auth();
  if (!session?.user || session.user.papel !== "ADMIN") {
    throw new Error("Apenas administradores podem alterar essas configurações.");
  }
}

const EmpresaSchema = z.object({
  nome: z.string().trim().min(2),
  razaoSocial: z.string().trim().optional(),
  cnpj: z.string().trim().optional(),
  ie: z.string().trim().optional(),
  telefones: z.string().trim().optional(),
  endereco: z.string().trim().optional(),
  cidadeUf: z.string().trim().min(2),
});

export async function atualizarEmpresa(formData: FormData) {
  await exigirAdmin();

  const dados = EmpresaSchema.parse({
    nome: formData.get("nome"),
    razaoSocial: formData.get("razaoSocial"),
    cnpj: formData.get("cnpj"),
    ie: formData.get("ie"),
    telefones: formData.get("telefones"),
    endereco: formData.get("endereco"),
    cidadeUf: formData.get("cidadeUf"),
  });

  await prisma.empresaConfig.upsert({
    where: { id: 1 },
    update: dados,
    create: { id: 1, ...dados },
  });
  revalidatePath("/configuracoes");
}

const UsuarioSchema = z.object({
  nome: z.string().trim().min(2),
  email: z.string().trim().email(),
  senha: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
  papel: z.enum(["ADMIN", "FUNCIONARIO"]),
});

export async function criarUsuario(formData: FormData) {
  await exigirAdmin();

  const dados = UsuarioSchema.parse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    senha: formData.get("senha"),
    papel: formData.get("papel"),
  });

  const senhaHash = await bcrypt.hash(dados.senha, 10);

  await prisma.usuario.create({
    data: {
      nome: dados.nome,
      email: dados.email.toLowerCase(),
      senhaHash,
      papel: dados.papel,
    },
  });
  revalidatePath("/configuracoes");
}

export async function alternarAtivoUsuario(usuarioId: string, ativo: boolean) {
  await exigirAdmin();
  await prisma.usuario.update({ where: { id: usuarioId }, data: { ativo } });
  revalidatePath("/configuracoes");
}

const RedefinirSenhaSchema = z.object({
  senha: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});

export async function redefinirSenhaUsuario(usuarioId: string, formData: FormData) {
  await exigirAdmin();

  const dados = RedefinirSenhaSchema.parse({ senha: formData.get("senha") });
  const senhaHash = await bcrypt.hash(dados.senha, 10);

  await prisma.usuario.update({ where: { id: usuarioId }, data: { senhaHash } });
  revalidatePath("/configuracoes");
}

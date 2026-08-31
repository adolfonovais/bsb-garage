"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const AlterarSenhaSchema = z
  .object({
    senhaAtual: z.string().min(1, "Informe sua senha atual."),
    novaSenha: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres."),
    confirmarSenha: z.string().min(1, "Confirme a nova senha."),
  })
  .refine((dados) => dados.novaSenha === dados.confirmarSenha, {
    message: "A confirmação não bate com a nova senha.",
    path: ["confirmarSenha"],
  });

export type AlterarSenhaState = { erro?: string; sucesso?: boolean } | undefined;

export async function alterarMinhaSenha(
  _prevState: AlterarSenhaState,
  formData: FormData
): Promise<AlterarSenhaState> {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const resultado = AlterarSenhaSchema.safeParse({
    senhaAtual: formData.get("senhaAtual"),
    novaSenha: formData.get("novaSenha"),
    confirmarSenha: formData.get("confirmarSenha"),
  });
  if (!resultado.success) {
    return { erro: resultado.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const dados = resultado.data;

  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: session.user.id } });
  const senhaValida = await bcrypt.compare(dados.senhaAtual, usuario.senhaHash);
  if (!senhaValida) {
    return { erro: "Senha atual incorreta." };
  }

  const senhaHash = await bcrypt.hash(dados.novaSenha, 10);
  await prisma.usuario.update({ where: { id: usuario.id }, data: { senhaHash } });

  return { sucesso: true };
}

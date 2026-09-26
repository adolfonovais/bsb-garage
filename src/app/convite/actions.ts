"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { prismaBase } from "@/lib/prisma-base";
import { lerToken } from "@/lib/tokens";

export type ConviteState = { erro?: string } | undefined;

const Schema = z.object({
  nome: z.string().trim().min(2, "Informe o seu nome."),
  senha: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});

export async function aceitarConvite(token: string, _prev: ConviteState, formData: FormData): Promise<ConviteState> {
  const convite = lerToken(token, "convite");
  if (!convite) return { erro: "Este convite é inválido ou expirou. Peça um novo ao administrador." };

  const parsed = Schema.safeParse({ nome: formData.get("nome"), senha: formData.get("senha") });
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const organizacao = await prismaBase.organizacao.findUnique({ where: { id: convite.oid } });
  if (!organizacao || !organizacao.ativa) return { erro: "Este convite não é mais válido." };

  const email = convite.email.toLowerCase();
  if (await prismaBase.usuario.findUnique({ where: { email }, select: { id: true } })) {
    return { erro: "Este convite já foi usado. Faça login." };
  }

  await prismaBase.usuario.create({
    data: {
      organizacaoId: organizacao.id,
      nome: parsed.data.nome,
      email,
      senhaHash: await bcrypt.hash(parsed.data.senha, 10),
      papel: convite.papel,
      // Quem abriu o link recebido no e-mail já provou que é dono dele.
      emailVerificadoEm: new Date(),
    },
  });

  try {
    await signIn("credentials", { email, senha: parsed.data.senha, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) return { erro: "Conta criada, mas não foi possível entrar automaticamente. Faça login." };
    throw error; // redirect do Next.js
  }
}

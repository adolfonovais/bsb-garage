"use server";

import { z } from "zod";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { prismaBase } from "@/lib/prisma-base";
import { cadastroAberto } from "@/lib/marca";
import { criarOrganizacaoComAdmin } from "@/lib/nova-organizacao";

export type CadastroState = { erro?: string } | undefined;

const CadastroSchema = z.object({
  nomeOficina: z.string().trim().min(2, "Informe o nome da oficina."),
  cidadeUf: z.string().trim().min(2, "Informe cidade e UF (ex: Goiânia - GO)."),
  nome: z.string().trim().min(2, "Informe o seu nome."),
  email: z.string().trim().email("E-mail inválido."),
  senha: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});

export async function criarConta(_prev: CadastroState, formData: FormData): Promise<CadastroState> {
  if (!cadastroAberto()) return { erro: "Cadastro ainda não está aberto." };

  // Campo-isca: humanos não veem; robôs preenchem.
  if (formData.get("x_confirmacao_interna")) return { erro: "Não foi possível criar a conta." };

  const parsed = CadastroSchema.safeParse({
    nomeOficina: formData.get("nomeOficina"),
    cidadeUf: formData.get("cidadeUf"),
    nome: formData.get("nome"),
    email: formData.get("email"),
    senha: formData.get("senha"),
  });
  if (!parsed.success) return { erro: parsed.error.issues[0].message };
  const dados = parsed.data;
  const email = dados.email.toLowerCase();

  if (await prismaBase.usuario.findUnique({ where: { email }, select: { id: true } })) {
    return { erro: "Já existe uma conta com esse e-mail. Faça login." };
  }

  await criarOrganizacaoComAdmin({
    nomeOficina: dados.nomeOficina,
    cidadeUf: dados.cidadeUf,
    nomeAdmin: dados.nome,
    email,
    senha: dados.senha,
    origemCadastro: "cadastro",
  });

  try {
    await signIn("credentials", { email, senha: dados.senha, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { erro: "Conta criada, mas não foi possível entrar automaticamente. Faça login." };
    }
    throw error; // redirect do Next.js
  }
}

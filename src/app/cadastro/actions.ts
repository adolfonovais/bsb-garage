"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { prismaBase } from "@/lib/prisma-base";
import { cadastroAberto, DIAS_DE_TESTE } from "@/lib/marca";

export type CadastroState = { erro?: string } | undefined;

const CadastroSchema = z.object({
  nomeOficina: z.string().trim().min(2, "Informe o nome da oficina."),
  cidadeUf: z.string().trim().min(2, "Informe cidade e UF (ex: Goiânia - GO)."),
  nome: z.string().trim().min(2, "Informe o seu nome."),
  email: z.string().trim().email("E-mail inválido."),
  senha: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});

// Catálogo inicial de tipos de serviço — cada organização recebe a sua cópia
// e edita como quiser (é o mesmo catálogo que a BSB Garage usa hoje).
const TIPOS_SERVICO_PADRAO = [
  "Martelinho de Ouro",
  "Pintura",
  "Lanternagem",
  "Pintura c/ Lanternagem",
  "Polimento Geral",
  "Polimento Localizado",
  "Polimento de Faróis",
  "Vitrificação",
  "Higienização",
  "Alinhamento de Para-choque",
];

function gerarSlug(nome: string) {
  const base = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "oficina"}-${Math.random().toString(36).slice(2, 7)}`;
}

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

  const senhaHash = await bcrypt.hash(dados.senha, 10);
  const trialTerminaEm = new Date(Date.now() + DIAS_DE_TESTE * 24 * 60 * 60 * 1000);

  await prismaBase.organizacao.create({
    data: {
      nome: dados.nomeOficina,
      slug: gerarSlug(dados.nomeOficina),
      plano: "trial",
      trialTerminaEm,
      origemCadastro: "cadastro",
      usuarios: { create: { nome: dados.nome, email, senhaHash, papel: "ADMIN" } },
      empresaConfig: { create: { nome: dados.nomeOficina, cidadeUf: dados.cidadeUf } },
      tiposServico: { create: TIPOS_SERVICO_PADRAO.map((nome) => ({ nome })) },
    },
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

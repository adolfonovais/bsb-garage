import bcrypt from "bcryptjs";
import { prismaBase } from "@/lib/prisma-base";
import { DIAS_DE_TESTE } from "@/lib/marca";

// Criação de uma organização nova (cliente da plataforma) com o administrador,
// os dados da empresa e o catálogo inicial de serviços. Usada pelo cadastro
// público (src/app/cadastro/actions.ts) e pelo script de administração
// (scripts/criar-organizacao.mts). Roda com prismaBase (sem tenant): ainda não
// existe organização/sessão nesse momento.

// Catálogo inicial de tipos de serviço — cada organização recebe a sua cópia
// e edita como quiser (é o mesmo catálogo que a BSB Garage usa hoje).
export const TIPOS_SERVICO_PADRAO = [
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

export function gerarSlug(nome: string, comSufixoAleatorio = true) {
  const base =
    nome
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "oficina";
  return comSufixoAleatorio ? `${base}-${Math.random().toString(36).slice(2, 7)}` : base;
}

export async function criarOrganizacaoComAdmin(params: {
  nomeOficina: string;
  cidadeUf: string;
  nomeAdmin: string;
  email: string;
  senha: string;
  slug?: string;
  origemCadastro: string;
}) {
  const senhaHash = await bcrypt.hash(params.senha, 10);
  const trialTerminaEm = new Date(Date.now() + DIAS_DE_TESTE * 24 * 60 * 60 * 1000);

  return prismaBase.organizacao.create({
    data: {
      nome: params.nomeOficina,
      slug: params.slug ?? gerarSlug(params.nomeOficina),
      plano: "trial",
      trialTerminaEm,
      origemCadastro: params.origemCadastro,
      usuarios: {
        create: { nome: params.nomeAdmin, email: params.email.toLowerCase(), senhaHash, papel: "ADMIN" },
      },
      empresaConfig: { create: { nome: params.nomeOficina, cidadeUf: params.cidadeUf } },
      tiposServico: { create: TIPOS_SERVICO_PADRAO.map((nome) => ({ nome })) },
    },
  });
}

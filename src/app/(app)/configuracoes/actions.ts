"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { prismaBase } from "@/lib/prisma-base";
import { auth } from "@/lib/auth";
import { organizacaoAtual, organizacaoIdAtual } from "@/lib/tenant";
import { criarToken } from "@/lib/tokens";
import { removerFoto, salvarFoto } from "@/lib/storage";
import { enviarEmailConvite, urlBase } from "@/lib/mail";

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

  const organizacaoId = await organizacaoIdAtual();
  await prisma.empresaConfig.upsert({
    where: { organizacaoId },
    update: dados,
    create: { ...dados, organizacaoId },
  });
  revalidatePath("/configuracoes");
}

const UsuarioSchema = z.object({
  nome: z.string().trim().min(2),
  email: z.string().trim().email(),
  senha: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
  papel: z.enum(["ADMIN", "FUNCIONARIO"]),
});

export type EstadoFormulario = { sucesso?: boolean; erro?: string } | undefined;

export async function criarUsuario(_prevState: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  await exigirAdmin();

  const dados = UsuarioSchema.parse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    senha: formData.get("senha"),
    papel: formData.get("papel"),
  });

  if (await prismaBase.usuario.findUnique({ where: { email: dados.email.toLowerCase() }, select: { id: true } })) {
    return { erro: "Já existe um usuário com esse e-mail." };
  }

  const senhaHash = await bcrypt.hash(dados.senha, 10);

  await prisma.usuario.create({
    data: {
      organizacaoId: await organizacaoIdAtual(),
      nome: dados.nome,
      email: dados.email.toLowerCase(),
      senhaHash,
      papel: dados.papel,
    },
  });
  revalidatePath("/configuracoes");
  return { sucesso: true };
}

export type EstadoLogo = { sucesso?: boolean; erro?: string } | undefined;

/** Envia (ou troca) a logo da oficina — vira a logo da barra lateral, das impressões e dos relatórios. */
export async function atualizarLogo(_prev: EstadoLogo, formData: FormData): Promise<EstadoLogo> {
  await exigirAdmin();
  const arquivo = formData.get("logo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: "Escolha uma imagem." };

  const organizacao = await organizacaoAtual();
  let url: string;
  try {
    url = await salvarFoto(`logos/${organizacao.id}`, arquivo);
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : "Não foi possível enviar a imagem." };
  }
  await prismaBase.organizacao.update({ where: { id: organizacao.id }, data: { logoUrl: url } });
  if (organizacao.logoUrl) await removerFoto(organizacao.logoUrl);
  revalidatePath("/", "layout");
  return { sucesso: true };
}

export async function removerLogo() {
  await exigirAdmin();
  const organizacao = await organizacaoAtual();
  if (!organizacao.logoUrl) return;
  await prismaBase.organizacao.update({ where: { id: organizacao.id }, data: { logoUrl: null } });
  await removerFoto(organizacao.logoUrl);
  revalidatePath("/", "layout");
}

export type EstadoConvite = { erro?: string; enviado?: string; link?: string } | undefined;

const ConviteSchema = z.object({
  email: z.string().trim().email("E-mail inválido."),
  papel: z.enum(["ADMIN", "FUNCIONARIO"]),
});

/** Convida alguém por e-mail: a pessoa abre o link, define nome e senha e já entra na organização. */
export async function convidarUsuario(_prev: EstadoConvite, formData: FormData): Promise<EstadoConvite> {
  await exigirAdmin();
  const parsed = ConviteSchema.safeParse({ email: formData.get("email"), papel: formData.get("papel") });
  if (!parsed.success) return { erro: parsed.error.issues[0].message };
  const email = parsed.data.email.toLowerCase();

  if (await prismaBase.usuario.findUnique({ where: { email }, select: { id: true } })) {
    return { erro: "Já existe um usuário com esse e-mail." };
  }

  const [session, organizacao] = await Promise.all([auth(), organizacaoAtual()]);
  const token = criarToken({ t: "convite", oid: organizacao.id, email, papel: parsed.data.papel }, 7 * 86400);
  const link = `${await urlBase()}/convite?token=${token}`;

  const enviado = await enviarEmailConvite({
    para: email,
    nomeOrganizacao: organizacao.nome,
    convidadoPor: session?.user?.name ?? organizacao.nome,
    link,
  });
  // Sem SMTP (ou falha no envio) devolve o link pra o admin mandar por outro meio.
  return enviado ? { enviado: `Convite enviado para ${email}. O link vale por 7 dias.` } : { link };
}

export async function alternarAtivoUsuario(usuarioId: string, ativo: boolean) {
  await exigirAdmin();
  await prisma.usuario.update({ where: { id: usuarioId }, data: { ativo } });
  revalidatePath("/configuracoes");
}

const EditarUsuarioSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome."),
  // Campo opcional: só troca a senha se algo for digitado. FormData.get()
  // volta null (não undefined) quando o campo vem vazio.
  novaSenha: z.string().trim().nullable().optional(),
});

export async function atualizarUsuario(
  usuarioId: string,
  _prevState: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  await exigirAdmin();

  const dados = EditarUsuarioSchema.parse({
    nome: formData.get("nome"),
    novaSenha: formData.get("novaSenha"),
  });

  const novaSenha = dados.novaSenha?.trim();
  if (novaSenha && novaSenha.length < 6) {
    throw new Error("A nova senha deve ter pelo menos 6 caracteres.");
  }

  await prisma.usuario.update({
    where: { id: usuarioId },
    data: {
      nome: dados.nome,
      ...(novaSenha ? { senhaHash: await bcrypt.hash(novaSenha, 10) } : {}),
    },
  });
  revalidatePath("/configuracoes");
  return { sucesso: true };
}

"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { signIn } from "@/lib/auth";
import { prismaBase } from "@/lib/prisma-base";
import { enviarEmailConfirmacao, urlBase } from "@/lib/mail";
import { criarToken } from "@/lib/tokens";

export type LoginState = { erro?: string; info?: string; naoVerificado?: boolean } | undefined;

// Usuário com senha correta mas e-mail ainda não confirmado (ou null).
async function usuarioNaoVerificado(formData: FormData) {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const senha = String(formData.get("senha") ?? "");
  if (!email || !senha) return null;
  const usuario = await prismaBase.usuario.findUnique({ where: { email } });
  if (!usuario || !usuario.ativo || usuario.emailVerificadoEm) return null;
  return (await bcrypt.compare(senha, usuario.senhaHash)) ? usuario : null;
}

export async function reenviarConfirmacao(_prev: LoginState, formData: FormData): Promise<LoginState> {
  // Só reenvia se a senha estiver certa — evita usar a tela pra encher a caixa de terceiros.
  const usuario = await usuarioNaoVerificado(formData);
  if (!usuario) return { erro: "Não foi possível reenviar. Confira e-mail e senha." };
  const token = criarToken({ t: "verificar", uid: usuario.id }, 48 * 3600);
  const enviado = await enviarEmailConfirmacao({
    para: usuario.email,
    nome: usuario.nome,
    link: `${await urlBase()}/verificar-email?token=${token}`,
  });
  return enviado
    ? { info: `Enviamos um novo link de confirmação para ${usuario.email}.` }
    : { erro: "Não foi possível enviar o e-mail agora. Fale com o suporte." };
}

export async function autenticar(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  if (await usuarioNaoVerificado(formData)) {
    return { erro: "Confirme o seu e-mail antes de entrar — enviamos um link quando você criou a conta.", naoVerificado: true };
  }
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      senha: formData.get("senha"),
      redirectTo: (formData.get("callbackUrl") as string) || "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { erro: "E-mail ou senha inválidos." };
        default:
          return { erro: "Não foi possível entrar. Tente novamente." };
      }
    }
    // Erros de redirecionamento do Next.js precisam continuar subindo.
    throw error;
  }
}

"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

export type LoginState = { erro?: string } | undefined;

export async function autenticar(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
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

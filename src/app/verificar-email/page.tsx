import Link from "next/link";
import { Wrench } from "lucide-react";
import { prismaBase } from "@/lib/prisma-base";
import { lerToken } from "@/lib/tokens";
import { NOME_PLATAFORMA } from "@/lib/marca";

export default async function VerificarEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const dados = lerToken(token, "verificar");

  // Idempotente: abrir o link duas vezes (ou um antivírus pré-abrir) não faz mal.
  let ok = false;
  if (dados) {
    const usuario = await prismaBase.usuario.findUnique({ where: { id: dados.uid }, select: { id: true, emailVerificadoEm: true } });
    if (usuario) {
      if (!usuario.emailVerificadoEm) {
        await prismaBase.usuario.update({ where: { id: usuario.id }, data: { emailVerificadoEm: new Date() } });
      }
      ok = true;
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow-xl">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500 text-black">
          <Wrench className="h-7 w-7" />
        </div>
        <h1 className="text-lg font-bold text-slate-900">{NOME_PLATAFORMA}</h1>
        <p className="mt-3 text-sm text-slate-600">
          {ok
            ? "E-mail confirmado! Sua conta está ativa."
            : "Este link de confirmação é inválido ou expirou. Tente entrar no login pra receber um novo."}
        </p>
        <Link href="/login" className="mt-4 inline-block text-sm font-medium text-amber-700 hover:underline">
          Ir para o login
        </Link>
      </div>
    </div>
  );
}

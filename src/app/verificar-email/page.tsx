import Link from "next/link";
import { prismaBase } from "@/lib/prisma-base";
import { lerToken } from "@/lib/tokens";
import { MarcaGarageFlow } from "@/components/MarcaGarageFlow";

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
    <div className="flex min-h-screen items-center justify-center bg-brand-dark px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow-xl">
        <MarcaGarageFlow className="mb-2 h-16 w-auto" />
        <p className="mt-3 text-sm text-slate-600">
          {ok
            ? "E-mail confirmado! Sua conta está ativa."
            : "Este link de confirmação é inválido ou expirou. Tente entrar no login pra receber um novo."}
        </p>
        <Link href="/login" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline">
          Ir para o login
        </Link>
      </div>
    </div>
  );
}

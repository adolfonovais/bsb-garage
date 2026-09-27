import Link from "next/link";
import { AceitarConviteForm } from "@/components/AceitarConviteForm";
import { prismaBase } from "@/lib/prisma-base";
import { lerToken } from "@/lib/tokens";
import { MarcaGarageFlow } from "@/components/MarcaGarageFlow";

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-dark px-4 py-8">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <MarcaGarageFlow className="mb-2 h-16 w-auto" />
        </div>
        {children}
      </div>
    </div>
  );
}

export default async function ConvitePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const convite = lerToken(token, "convite");

  const organizacao = convite ? await prismaBase.organizacao.findUnique({ where: { id: convite.oid } }) : null;
  const jaExiste = convite
    ? !!(await prismaBase.usuario.findUnique({ where: { email: convite.email.toLowerCase() }, select: { id: true } }))
    : false;

  if (!convite || !organizacao || !organizacao.ativa || jaExiste) {
    return (
      <Moldura>
        <p className="text-center text-sm text-slate-600">
          {jaExiste
            ? "Este convite já foi usado. Faça login com o seu e-mail e senha."
            : "Este convite é inválido ou expirou. Peça um novo ao administrador da oficina."}
        </p>
        <Link href="/login" className="mt-4 block text-center text-sm font-medium text-brand-700 hover:underline">
          Ir para o login
        </Link>
      </Moldura>
    );
  }

  return (
    <Moldura>
      <p className="mb-4 text-center text-sm text-slate-600">
        Você foi convidado(a) para <strong className="text-slate-900">{organizacao.nome}</strong> como{" "}
        {convite.papel === "ADMIN" ? "administrador(a)" : "funcionário(a)"}.
      </p>
      <AceitarConviteForm token={token!} email={convite.email} />
    </Moldura>
  );
}

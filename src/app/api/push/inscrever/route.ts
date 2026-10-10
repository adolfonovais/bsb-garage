import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prismaBase } from "@/lib/prisma-base";
import { organizacaoIdAtual } from "@/lib/tenant";

type Corpo = { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

/** Guarda a inscrição de notificações push do navegador de quem está logado. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const corpo = (await req.json().catch(() => null)) as Corpo | null;
  const endpoint = corpo?.endpoint;
  const p256dh = corpo?.keys?.p256dh;
  const authKey = corpo?.keys?.auth;
  if (!endpoint || !p256dh || !authKey || !/^https:\/\//.test(endpoint)) {
    return NextResponse.json({ erro: "Inscrição inválida." }, { status: 400 });
  }

  const organizacaoId = await organizacaoIdAtual();
  // Mesmo navegador pode trocar de usuário/organização: o endpoint é único.
  await prismaBase.pushInscricao.deleteMany({ where: { endpoint } });
  await prismaBase.pushInscricao.create({
    data: { organizacaoId, usuarioId: session.user.id, endpoint, p256dh, auth: authKey },
  });

  return NextResponse.json({ ok: true });
}

/** Remove a inscrição (usuário desligou as notificações neste navegador). */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const corpo = (await req.json().catch(() => null)) as Corpo | null;
  if (corpo?.endpoint) {
    const organizacaoId = await organizacaoIdAtual();
    await prismaBase.pushInscricao.deleteMany({ where: { endpoint: corpo.endpoint, organizacaoId } });
  }
  return NextResponse.json({ ok: true });
}

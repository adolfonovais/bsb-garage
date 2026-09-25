"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prismaBase } from "@/lib/prisma-base";
import { ehAdminDaPlataforma, organizacaoIdAtual } from "@/lib/tenant";
import { DIAS_DE_TESTE } from "@/lib/marca";

// Painel do dono da plataforma — enxerga TODAS as organizações, por isso usa
// prismaBase (sem isolamento) e checa o e-mail na lista de admins da plataforma.
async function exigirAdminDaPlataforma() {
  const session = await auth();
  if (!ehAdminDaPlataforma(session?.user?.email)) {
    throw new Error("Acesso restrito ao administrador da plataforma.");
  }
}

export async function alternarOrganizacaoAtiva(organizacaoId: string, ativa: boolean) {
  await exigirAdminDaPlataforma();
  if (!ativa && organizacaoId === (await organizacaoIdAtual())) {
    throw new Error("Você não pode suspender a própria organização.");
  }
  await prismaBase.organizacao.update({ where: { id: organizacaoId }, data: { ativa } });
  revalidatePath("/plataforma");
}

export async function estenderTeste(organizacaoId: string) {
  await exigirAdminDaPlataforma();
  const org = await prismaBase.organizacao.findUniqueOrThrow({ where: { id: organizacaoId } });
  const base = org.trialTerminaEm && org.trialTerminaEm > new Date() ? org.trialTerminaEm : new Date();
  await prismaBase.organizacao.update({
    where: { id: organizacaoId },
    data: { plano: "trial", trialTerminaEm: new Date(base.getTime() + DIAS_DE_TESTE * 86_400_000) },
  });
  revalidatePath("/plataforma");
}

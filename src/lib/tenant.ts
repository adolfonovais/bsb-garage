import { cache } from "react";
import { auth } from "@/lib/auth";
import { prismaBase } from "@/lib/prisma-base";

/**
 * Organização (tenant) do usuário logado — vem da sessão (JWT). É o que o
 * PrismaClient de "@/lib/prisma" usa pra isolar os dados de cada cliente.
 * Sem sessão, lança erro: nenhuma consulta de negócio deve rodar sem tenant.
 */
export const organizacaoIdAtual = cache(async (): Promise<string> => {
  const session = await auth();
  const organizacaoId = session?.user?.organizacaoId;
  if (!organizacaoId) {
    throw new Error("Sem organização na sessão — faça login novamente.");
  }
  return organizacaoId;
});

/** Dados da organização da sessão (plano, flags de recursos). */
export const organizacaoAtual = cache(async () => {
  const organizacaoId = await organizacaoIdAtual();
  return prismaBase.organizacao.findUniqueOrThrow({ where: { id: organizacaoId } });
});

/**
 * Administradores da plataforma (donos do SaaS) — enxergam o painel /plataforma
 * com todas as organizações. Lista de e-mails na env PLATAFORMA_ADMIN_EMAILS
 * (separados por vírgula); o padrão é o admin da BSB Garage.
 */
export function ehAdminDaPlataforma(email: string | null | undefined): boolean {
  if (!email) return false;
  const lista = (process.env.PLATAFORMA_ADMIN_EMAILS || "adolfo@bsbgarage.com.br")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return lista.includes(email.toLowerCase());
}

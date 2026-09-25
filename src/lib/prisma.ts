import { criarPrismaComTenant } from "@/lib/prisma-tenant";
import { organizacaoIdAtual } from "@/lib/tenant";

// Timeout mais folgado para transações (padrão do Prisma é maxWait: 2000ms,
// timeout: 5000ms — curto demais em dev, onde uma rota sendo compilada pela
// primeira vez pode travar o event loop por vários segundos e estourar o
// prazo pra simplesmente abrir a transação). Usar em todo `prisma.$transaction(...)`.
export const TX_OPTIONS = { maxWait: 15_000, timeout: 15_000 };

/**
 * PrismaClient de todo o app, isolado pela organização da sessão (ver
 * prisma-tenant.ts pra regras). Fora de sessão (login, cadastro, seed) use `prismaBase`.
 */
export const prisma = criarPrismaComTenant(organizacaoIdAtual);

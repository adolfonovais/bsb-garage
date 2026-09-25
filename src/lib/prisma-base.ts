import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Cliente "cru", SEM isolamento por organização. Só pra código que roda
// antes/fora de uma sessão de usuário (login, cadastro de nova organização,
// jobs, seed). Todo o resto do app usa o `prisma` de "@/lib/prisma", que
// filtra tudo pela organização da sessão.
//
// A partir do Prisma 7, o PrismaClient precisa de um driver adapter em vez de
// receber a URL do banco diretamente (ver prisma.config.ts para o CLI).
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Evita múltiplas instâncias do PrismaClient em dev (hot reload do Next.js).
const globalForPrisma = globalThis as unknown as {
  prismaBase: PrismaClient | undefined;
};

export const prismaBase =
  globalForPrisma.prismaBase ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaBase = prismaBase;
}

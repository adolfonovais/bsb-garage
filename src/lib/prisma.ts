import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// A partir do Prisma 7, o PrismaClient precisa de um driver adapter em vez de
// receber a URL do banco diretamente (ver prisma.config.ts para o CLI).
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Evita múltiplas instâncias do PrismaClient em dev (hot reload do Next.js).
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Timeout mais folgado para transações (padrão do Prisma é maxWait: 2000ms,
// timeout: 5000ms — curto demais em dev, onde uma rota sendo compilada pela
// primeira vez pode travar o event loop por vários segundos e estourar o
// prazo pra simplesmente abrir a transação). Usar em todo `prisma.$transaction(...)`.
export const TX_OPTIONS = { maxWait: 15_000, timeout: 15_000 };

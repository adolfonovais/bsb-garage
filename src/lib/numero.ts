import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type ClientOuTx = typeof prisma | Prisma.TransactionClient;

/**
 * Gera o próximo número sequencial (por ano) para Orçamento ou Ordem de Serviço.
 * Usa upsert na tabela Contador — quando chamado dentro de prisma.$transaction,
 * o próprio banco serializa incrementos concorrentes pela constraint única.
 */
export async function proximoNumero(
  chave: "ORCAMENTO" | "OS" | "NFSE",
  ano: number,
  tx?: ClientOuTx
): Promise<number> {
  const client = tx ?? prisma;

  const contador = await client.contador.upsert({
    where: { chave_ano: { chave, ano } },
    create: { chave, ano, ultimo: 1 },
    update: { ultimo: { increment: 1 } },
  });

  return contador.ultimo;
}

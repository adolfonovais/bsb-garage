import { prisma } from "@/lib/prisma";
import { organizacaoIdAtual } from "@/lib/tenant";

type ClientOuTx = typeof prisma | Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

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
  const organizacaoId = await organizacaoIdAtual();

  const contador = await client.contador.upsert({
    where: { organizacaoId_chave_ano: { organizacaoId, chave, ano } },
    create: { organizacaoId, chave, ano, ultimo: 1 },
    update: { ultimo: { increment: 1 } },
  });

  return contador.ultimo;
}

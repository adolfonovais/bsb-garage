import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { organizacaoIdAtual } from "@/lib/tenant";

/**
 * Guarda uma cópia completa do que acabou de ser excluído (OS, orçamento,
 * cliente), com quem excluiu — consulta em Configurações → Exclusões. Chamar
 * só depois que a exclusão deu certo.
 */
export async function registrarExclusao(params: {
  tipo: "OS" | "ORCAMENTO" | "CLIENTE" | "VEICULO" | "MENSAGEM_WHATSAPP" | "CONVERSA_WHATSAPP";
  referencia: string;
  resumo: string;
  dados: unknown;
}): Promise<void> {
  const session = await auth();
  try {
    await prisma.registroExclusao.create({
      data: {
        organizacaoId: await organizacaoIdAtual(),
        tipo: params.tipo,
        referencia: params.referencia,
        resumo: params.resumo,
        // Decimal e Date viram texto/ISO ao passar por JSON.
        dados: JSON.parse(JSON.stringify(params.dados)) as Prisma.InputJsonValue,
        usuarioId: session?.user?.id,
        usuarioNome: session?.user?.name,
      },
    });
  } catch (erro) {
    // A exclusão já foi feita; falhar aqui não deve quebrar a tela do usuário.
    console.error("[exclusoes] Não foi possível registrar a exclusão:", erro);
  }
}

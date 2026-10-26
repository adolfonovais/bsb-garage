import type { prisma } from "@/lib/prisma";
import type { ItemParseado } from "@/lib/itens";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Atualiza os serviços de uma OS preservando a identidade dos que não mudaram.
 *
 * Apagar tudo e recriar (o que a edição fazia) gerava ids novos, e como o
 * vínculo "esse serviço já foi repassado" (RepasseItem) aponta pro id do
 * serviço, editar uma OS soltava os repasses dela: eles passavam a valer
 * como "OS inteira" e a OS sumia da lista de repasse.
 *
 * Um serviço é o mesmo se tem a mesma descrição e o mesmo tipo de serviço;
 * nesse caso só quantidade, valores e ordem são atualizados. Os que não
 * existiam são criados e os que sumiram do formulário são apagados.
 */
export async function sincronizarItensDaOS(tx: Tx, osId: string, itens: ItemParseado[]): Promise<void> {
  const antigos = await tx.ordemServicoItem.findMany({ where: { osId } });
  const mantidos = new Set<string>();

  for (const item of itens) {
    const existente = antigos.find(
      (a) => !mantidos.has(a.id) && a.descricao === item.descricao && (a.tipoServicoId ?? null) === item.tipoServicoId
    );

    if (existente) {
      mantidos.add(existente.id);
      await tx.ordemServicoItem.update({
        where: { id: existente.id },
        data: {
          quantidade: item.quantidade,
          valorUnit: item.valorUnit,
          valorTotal: item.valorTotal,
          ordem: item.ordem,
        },
      });
    } else {
      const criado = await tx.ordemServicoItem.create({
        data: {
          osId,
          descricao: item.descricao,
          quantidade: item.quantidade,
          valorUnit: item.valorUnit,
          valorTotal: item.valorTotal,
          ordem: item.ordem,
          tipoServicoId: item.tipoServicoId,
        },
      });
      mantidos.add(criado.id);
    }
  }

  await tx.ordemServicoItem.deleteMany({ where: { osId, id: { notIn: [...mantidos] } } });
}

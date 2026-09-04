import { prisma } from "@/lib/prisma";
import { paraNumero } from "@/lib/format";

// Usado tanto em /repasses/novo quanto em /repasses/[id] (editar) — monta,
// pra cada OS não cancelada, a lista de itens com quais prestadores já
// receberam cada um (RepasseItem de repasses ainda válidos, ou a OS inteira
// quando o repasse é antigo/sem item rastreado — ver comentário abaixo).
// `excluirRepasseId` tira o próprio repasse sendo editado dessa contagem,
// senão editar um repasse faria ele "esconder" os itens que ele mesmo já usa.

export type ItemOSDisponibilidade = {
  id: string;
  descricao: string;
  valorTotal: number;
  tipoServicoNome: string | null;
  oficinaIdsJaRepassados: string[];
};

export type OSParaRepasse = {
  id: string;
  numero: number;
  ano: number;
  cliente: { nome: string };
  veiculo: { modelo: string; placa: string | null } | null;
  itens: ItemOSDisponibilidade[];
};

export async function buscarOrdensParaRepasse(excluirRepasseId?: string): Promise<OSParaRepasse[]> {
  const [ordensRaw, repassesComOS] = await Promise.all([
    prisma.ordemServico.findMany({
      where: { status: { not: "CANCELADA" } },
      include: {
        cliente: true,
        veiculo: true,
        itens: { orderBy: { ordem: "asc" }, include: { tipoServico: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    // Repasses ainda válidos (cancelado libera o item de novo), com qual
    // prestador recebeu e quais itens cada um registrou ter coberto.
    prisma.repasseOficina.findMany({
      where: {
        status: { not: "CANCELADO" },
        osId: { not: null },
        id: excluirRepasseId ? { not: excluirRepasseId } : undefined,
      },
      select: { osId: true, oficinaId: true, itens: { select: { itemId: true } } },
    }),
  ]);

  // Repasses feitos ANTES dessa funcionalidade (ou sem nenhum item marcado)
  // não têm RepasseItem — não dá pra saber qual item específico cobriram,
  // então a OS inteira fica marcada como já repassada PRA AQUELE prestador.
  const oficinaIdsTotaisPorOS = new Map<string, Set<string>>();
  const oficinaIdsPorItem = new Map<string, Set<string>>();
  for (const r of repassesComOS) {
    if (r.itens.length === 0) {
      if (r.osId) {
        const atual = oficinaIdsTotaisPorOS.get(r.osId) ?? new Set<string>();
        atual.add(r.oficinaId);
        oficinaIdsTotaisPorOS.set(r.osId, atual);
      }
    } else {
      for (const it of r.itens) {
        const atual = oficinaIdsPorItem.get(it.itemId) ?? new Set<string>();
        atual.add(r.oficinaId);
        oficinaIdsPorItem.set(it.itemId, atual);
      }
    }
  }

  return ordensRaw.map((os) => {
    const oficinasTotais = oficinaIdsTotaisPorOS.get(os.id);
    return {
      id: os.id,
      numero: os.numero,
      ano: os.ano,
      cliente: { nome: os.cliente.nome },
      veiculo: os.veiculo ? { modelo: os.veiculo.modelo, placa: os.veiculo.placa } : null,
      itens: os.itens.map((item) => ({
        id: item.id,
        descricao: item.descricao,
        valorTotal: paraNumero(item.valorTotal),
        tipoServicoNome: item.tipoServico?.nome ?? null,
        oficinaIdsJaRepassados: [
          ...new Set([...(oficinaIdsPorItem.get(item.id) ?? []), ...(oficinasTotais ?? [])]),
        ],
      })),
    };
  });
}

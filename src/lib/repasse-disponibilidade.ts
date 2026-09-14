import { prisma } from "@/lib/prisma";
import { paraNumero } from "@/lib/format";

// Usado tanto em /repasses/novo quanto em /repasses/[id] (editar) — monta,
// pra cada OS não cancelada, a lista de itens com quais prestadores já
// receberam cada um (RepasseItem de repasses ainda válidos, ou a OS inteira
// quando o repasse é antigo/sem item rastreado — ver comentário abaixo).
// `excluirRepasseId` tira o próprio repasse sendo editado dessa contagem,
// senão editar um repasse faria ele "esconder" os itens que ele mesmo já usa.

export type RepasseExistente = {
  oficinaId: string;
  oficinaNome: string;
  status: string;
};

export type ItemOSDisponibilidade = {
  id: string;
  descricao: string;
  valorTotal: number;
  tipoServicoNome: string | null;
  /** Repasses (não cancelados) que já cobrem esse item, com prestador e status
   * — usado tanto pra filtrar o dropdown quanto pra explicar pro usuário por
   * que um item/OS não aparece mais como opção. */
  repassesExistentes: RepasseExistente[];
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
    // prestador recebeu, em que status está, e quais itens cada um
    // registrou ter coberto.
    prisma.repasseOficina.findMany({
      where: {
        status: { not: "CANCELADO" },
        osId: { not: null },
        id: excluirRepasseId ? { not: excluirRepasseId } : undefined,
      },
      select: {
        osId: true,
        status: true,
        oficina: { select: { id: true, nome: true } },
        itens: { select: { itemId: true } },
      },
    }),
  ]);

  // Repasses feitos ANTES dessa funcionalidade (ou sem nenhum item marcado)
  // não têm RepasseItem — não dá pra saber qual item específico cobriram,
  // então a OS inteira fica marcada como já repassada PRA AQUELE prestador.
  // Quando o repasse marcou itens específicos, só esses ficam marcados.
  const totaisPorOS = new Map<string, RepasseExistente[]>();
  const porItem = new Map<string, RepasseExistente[]>();
  for (const r of repassesComOS) {
    const info: RepasseExistente = { oficinaId: r.oficina.id, oficinaNome: r.oficina.nome, status: r.status };
    if (r.itens.length === 0) {
      if (r.osId) {
        const atual = totaisPorOS.get(r.osId) ?? [];
        atual.push(info);
        totaisPorOS.set(r.osId, atual);
      }
    } else {
      for (const it of r.itens) {
        const atual = porItem.get(it.itemId) ?? [];
        atual.push(info);
        porItem.set(it.itemId, atual);
      }
    }
  }

  return ordensRaw.map((os) => {
    const totais = totaisPorOS.get(os.id) ?? [];
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
        repassesExistentes: [...(porItem.get(item.id) ?? []), ...totais],
      })),
    };
  });
}

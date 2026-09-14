import { prisma } from "@/lib/prisma";
import { paraNumero } from "@/lib/format";

// Usado tanto em /repasses/novo quanto em /repasses/[id] (editar). `excluirRepasseId`
// tira o próprio repasse sendo editado dessa contagem, senão editar um
// repasse faria ele "esconder" a própria OS que ele mesmo usa.

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
  /** Repasses (não cancelados) que citam esse item especificamente. */
  repassesExistentes: RepasseExistente[];
};

export type OSParaRepasse = {
  id: string;
  numero: number;
  ano: number;
  cliente: { nome: string };
  veiculo: { modelo: string; placa: string | null } | null;
  itens: ItemOSDisponibilidade[];
  /**
   * Qualquer repasse (não cancelado) que já existe pra essa OS, um por
   * prestador — uma OS só deve ter UM repasse por prestador; se já existe
   * um (completo ou não), a OS some do dropdown pra ESSE prestador e quem
   * precisar adicionar mais itens edita o repasse existente, em vez de
   * criar outro. Pra outro prestador, a OS continua disponível normalmente.
   */
  repassesOS: RepasseExistente[];
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
    // Repasses ainda válidos (cancelado libera a OS de novo pro mesmo
    // prestador), com qual prestador recebeu, em que status está, e quais
    // itens cada um registrou ter coberto (se algum).
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

  const repassesPorOS = new Map<string, RepasseExistente[]>();
  const porItem = new Map<string, RepasseExistente[]>();
  for (const r of repassesComOS) {
    const info: RepasseExistente = { oficinaId: r.oficina.id, oficinaNome: r.oficina.nome, status: r.status };
    if (r.osId) {
      const atual = repassesPorOS.get(r.osId) ?? [];
      atual.push(info);
      repassesPorOS.set(r.osId, atual);
    }
    for (const it of r.itens) {
      const atualItem = porItem.get(it.itemId) ?? [];
      atualItem.push(info);
      porItem.set(it.itemId, atualItem);
    }
  }

  return ordensRaw.map((os) => ({
    id: os.id,
    numero: os.numero,
    ano: os.ano,
    cliente: { nome: os.cliente.nome },
    veiculo: os.veiculo ? { modelo: os.veiculo.modelo, placa: os.veiculo.placa } : null,
    repassesOS: repassesPorOS.get(os.id) ?? [],
    itens: os.itens.map((item) => ({
      id: item.id,
      descricao: item.descricao,
      valorTotal: paraNumero(item.valorTotal),
      tipoServicoNome: item.tipoServico?.nome ?? null,
      repassesExistentes: porItem.get(item.id) ?? [],
    })),
  }));
}

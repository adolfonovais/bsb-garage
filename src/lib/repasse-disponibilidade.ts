import { prisma } from "@/lib/prisma";
import { numeroFormatado, paraNumero } from "@/lib/format";

// Regras de disponibilidade pra repasse (usado em /repasses/novo, em
// /repasses/[id] (editar) e na validação das ações no servidor):
//
//  - Um serviço (item da OS) que já foi repassado — pra QUALQUER prestador —
//    não aparece mais pra outro repasse. Os demais serviços da mesma OS
//    continuam disponíveis.
//  - OS já ENTREGUE (ou cancelada) não aceita novos repasses.
//  - Repasse "da OS inteira" (sem itens marcados) ocupa todos os serviços.
//
// `excluirRepasseId` tira o próprio repasse sendo editado dessa conta, senão
// editar um repasse faria ele "esconder" os serviços que ele mesmo usa — e a
// OS dele continua aparecendo mesmo que já tenha sido entregue.

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
  /** Pode ser repassado agora: nenhum repasse válido (de qualquer prestador) cobre esse serviço. */
  disponivel: boolean;
};

export type OSParaRepasse = {
  id: string;
  numero: number;
  ano: number;
  cliente: { nome: string };
  veiculo: { modelo: string; placa: string | null } | null;
  itens: ItemOSDisponibilidade[];
  /** Qualquer repasse (não cancelado) que já existe pra essa OS. */
  repassesOS: RepasseExistente[];
  /** Tem pelo menos um serviço ainda não repassado (e a OS não foi entregue). */
  disponivel: boolean;
};

export async function buscarOrdensParaRepasse(excluirRepasseId?: string): Promise<OSParaRepasse[]> {
  // A OS do repasse que está sendo editado precisa continuar na lista, mesmo
  // se já foi entregue — senão a tela de edição não conseguiria mostrá-la.
  const repasseEditado = excluirRepasseId
    ? await prisma.repasseOficina.findUnique({ where: { id: excluirRepasseId }, select: { osId: true } })
    : null;
  const osDoRepasseEditado = repasseEditado?.osId ?? null;

  const [ordensRaw, repassesComOS] = await Promise.all([
    prisma.ordemServico.findMany({
      where: {
        OR: [
          { status: { notIn: ["CANCELADA", "ENTREGUE"] } },
          ...(osDoRepasseEditado ? [{ id: osDoRepasseEditado }] : []),
        ],
      },
      include: {
        cliente: true,
        veiculo: true,
        itens: { orderBy: { ordem: "asc" }, include: { tipoServico: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    // Repasses ainda válidos (cancelado libera os serviços de novo), com
    // qual prestador recebeu, em que status está, e quais itens cada um
    // registrou ter coberto (se algum).
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
  const osRepassadaInteira = new Set<string>();
  const porItem = new Map<string, RepasseExistente[]>();
  for (const r of repassesComOS) {
    const info: RepasseExistente = { oficinaId: r.oficina.id, oficinaNome: r.oficina.nome, status: r.status };
    if (r.osId) {
      const atual = repassesPorOS.get(r.osId) ?? [];
      atual.push(info);
      repassesPorOS.set(r.osId, atual);
      if (r.itens.length === 0) osRepassadaInteira.add(r.osId);
    }
    for (const it of r.itens) {
      const atualItem = porItem.get(it.itemId) ?? [];
      atualItem.push(info);
      porItem.set(it.itemId, atualItem);
    }
  }

  return ordensRaw.map((os) => {
    const repassesOS = repassesPorOS.get(os.id) ?? [];
    const inteira = osRepassadaInteira.has(os.id);
    const itens = os.itens.map((item) => {
      const existentes = porItem.get(item.id) ?? [];
      return {
        id: item.id,
        descricao: item.descricao,
        valorTotal: paraNumero(item.valorTotal),
        tipoServicoNome: item.tipoServico?.nome ?? null,
        repassesExistentes: existentes,
        disponivel: !inteira && existentes.length === 0,
      };
    });
    return {
      id: os.id,
      numero: os.numero,
      ano: os.ano,
      cliente: { nome: os.cliente.nome },
      veiculo: os.veiculo ? { modelo: os.veiculo.modelo, placa: os.veiculo.placa } : null,
      repassesOS,
      itens,
      disponivel: itens.length === 0 ? repassesOS.length === 0 : itens.some((i) => i.disponivel),
    };
  });
}

/**
 * Confere no servidor as mesmas regras da tela (que pode estar desatualizada
 * ou ter sido contornada). Devolve a mensagem de erro, ou null se pode salvar.
 */
export async function validarDisponibilidadeRepasse(params: {
  osId: string | null | undefined;
  itemIds: string[];
  repasseEmEdicaoId?: string;
}): Promise<string | null> {
  if (!params.osId) return null; // repasse avulso, sem OS

  const os = await prisma.ordemServico.findUnique({
    where: { id: params.osId },
    include: { itens: { select: { id: true, descricao: true } } },
  });
  if (!os) return "OS não encontrada.";
  const numero = numeroFormatado(os.numero, os.ano);

  const repasseEditado = params.repasseEmEdicaoId
    ? await prisma.repasseOficina.findUnique({ where: { id: params.repasseEmEdicaoId }, select: { osId: true } })
    : null;

  if (os.status === "CANCELADA") return `A OS ${numero} está cancelada e não aceita repasses.`;
  if (os.status === "ENTREGUE" && repasseEditado?.osId !== os.id) {
    return `A OS ${numero} já foi entregue e não aceita novos repasses.`;
  }

  const outros = await prisma.repasseOficina.findMany({
    where: {
      osId: os.id,
      status: { not: "CANCELADO" },
      id: params.repasseEmEdicaoId ? { not: params.repasseEmEdicaoId } : undefined,
    },
    select: { oficina: { select: { nome: true } }, itens: { select: { itemId: true } } },
  });

  const repassadaInteira = outros.find((r) => r.itens.length === 0);
  if (repassadaInteira) {
    return `A OS ${numero} já foi repassada por inteiro para ${repassadaInteira.oficina.nome}.`;
  }

  const ocupados = new Map<string, string>();
  for (const r of outros) for (const it of r.itens) ocupados.set(it.itemId, r.oficina.nome);

  const itensDaOS = new Map(os.itens.map((i) => [i.id, i.descricao]));
  for (const itemId of params.itemIds) {
    const descricao = itensDaOS.get(itemId);
    if (descricao === undefined) return "Um dos serviços marcados não pertence a essa OS.";
    const prestador = ocupados.get(itemId);
    if (prestador) return `O serviço "${descricao}" já foi repassado para ${prestador}.`;
  }

  if (params.itemIds.length === 0 && outros.length > 0) {
    return "Marque os serviços que estão indo para este prestador — os demais da OS já foram repassados.";
  }
  return null;
}

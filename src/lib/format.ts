import { Prisma } from "@prisma/client";

type Numerico = number | string | Prisma.Decimal | null | undefined;

export function paraNumero(valor: Numerico): number {
  if (valor === null || valor === undefined) return 0;
  if (typeof valor === "number") return valor;
  if (typeof valor === "string") return Number(valor) || 0;
  return valor.toNumber();
}

const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatarMoeda(valor: Numerico): string {
  return formatadorMoeda.format(paraNumero(valor));
}

const formatadorData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatarData(data: Date | string | null | undefined): string {
  if (!data) return "-";
  const d = typeof data === "string" ? new Date(data) : data;
  if (Number.isNaN(d.getTime())) return "-";
  return formatadorData.format(d);
}

export function formatarDataHora(data: Date | string | null | undefined): string {
  if (!data) return "-";
  const d = typeof data === "string" ? new Date(data) : data;
  if (Number.isNaN(d.getTime())) return "-";
  return `${formatarData(d)} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

/**
 * Converte o valor de um <input type="date"> ("AAAA-MM-DD") em Date sem sofrer
 * o "bug do dia anterior": interpretar a string como UTC meia-noite e depois
 * exibir no fuso local (ex: America/Sao_Paulo) faz a data voltar um dia. Ancorar
 * ao meio-dia evita cruzar a virada do dia em qualquer fuso horário razoável.
 */
export function dataDoFormulario(valor: FormDataEntryValue | null | undefined): Date | null {
  const texto = typeof valor === "string" ? valor.trim() : "";
  if (!texto) return null;
  return new Date(`${texto}T12:00:00`);
}

// Formato usado em campos <input type="date">
export function paraInputDate(data: Date | string | null | undefined): string {
  if (!data) return "";
  const d = typeof data === "string" ? new Date(data) : data;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export const STATUS_ORCAMENTO_LABEL: Record<string, string> = {
  PENDENTE: "Pendente",
  APROVADO: "Aprovado",
  RECUSADO: "Recusado",
  EXPIRADO: "Expirado",
};

export const STATUS_OS_LABEL: Record<string, string> = {
  ABERTA: "Aberta",
  EM_ANDAMENTO: "Em andamento",
  AGUARDANDO_PECA: "Aguardando peça",
  CONCLUIDA: "Concluída",
  ENTREGUE: "Entregue",
  CANCELADA: "Cancelada",
};

export const STATUS_CONTA_LABEL: Record<string, string> = {
  ABERTA: "Aberta",
  PAGA: "Paga",
  ATRASADA: "Atrasada",
  CANCELADA: "Cancelada",
};

export const STATUS_REPASSE_LABEL: Record<string, string> = {
  EM_ANDAMENTO: "Em andamento",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
};

export function numeroFormatado(numero: number, ano: number): string {
  return `${ano}-${String(numero).padStart(4, "0")}`;
}

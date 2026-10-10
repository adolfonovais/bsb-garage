import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { organizacaoAtual } from "@/lib/tenant";
import { telefoneCanonico, whatsappConfigurado } from "@/lib/whatsapp";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { formatarDataHora, formatarTelefone } from "@/lib/format";

type Conversa = {
  canonico: string;
  telefone: string;
  clienteId: string | null;
  clienteNome: string | null;
  ultimoCorpo: string;
  ultimaData: Date;
  ultimaDirecao: "ENTRADA" | "SAIDA";
  naoLidas: number;
};

export default async function WhatsAppInboxPage() {
  const organizacao = await organizacaoAtual();
  if (!whatsappConfigurado(organizacao.whatsappPhoneId)) redirect("/dashboard");

  const mensagens = await prisma.mensagemWhatsApp.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
    include: { cliente: { select: { id: true, nome: true } } },
  });

  const conversas = new Map<string, Conversa>();
  for (const msg of mensagens) {
    const canonico = telefoneCanonico(msg.telefone);
    const existente = conversas.get(canonico);
    if (!existente) {
      conversas.set(canonico, {
        canonico,
        telefone: msg.telefone,
        clienteId: msg.cliente?.id ?? null,
        clienteNome: msg.cliente?.nome ?? null,
        ultimoCorpo: msg.corpo,
        ultimaData: msg.createdAt,
        ultimaDirecao: msg.direcao as "ENTRADA" | "SAIDA",
        naoLidas: 0,
      });
    }
    const atual = conversas.get(canonico)!;
    if (msg.direcao === "ENTRADA" && !msg.lidaEm) atual.naoLidas += 1;
    if (existente && !existente.clienteNome && msg.cliente?.nome) {
      existente.clienteNome = msg.cliente.nome;
      existente.clienteId = msg.cliente.id;
    }
  }

  const lista = [...conversas.values()];

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="WhatsApp" subtitle="Conversas recebidas e enviadas pelo número da oficina." />

      {lista.length === 0 ? (
        <EmptyState>Nenhuma conversa ainda. Mensagens recebidas no número da oficina aparecem aqui.</EmptyState>
      ) : (
        <Card>
          <div className="divide-y divide-slate-100">
            {lista.map((conversa) => (
              <Link
                key={conversa.canonico}
                href={`/whatsapp/${conversa.canonico}`}
                className="flex items-start justify-between gap-4 px-4 py-3 hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className={`truncate text-slate-900 ${conversa.naoLidas > 0 ? "font-bold" : "font-medium"}`}>
                    {conversa.clienteNome || formatarTelefone(conversa.telefone)}
                  </p>
                  <p className="truncate text-sm text-slate-500">
                    {conversa.ultimaDirecao === "SAIDA" ? "Você: " : ""}
                    {conversa.ultimoCorpo}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="whitespace-nowrap text-xs text-slate-400">{formatarDataHora(conversa.ultimaData)}</span>
                  {conversa.naoLidas > 0 && (
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[11px] font-semibold text-white">
                      {conversa.naoLidas}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

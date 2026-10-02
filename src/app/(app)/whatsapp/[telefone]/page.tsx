import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { organizacaoAtual } from "@/lib/tenant";
import { telefoneCanonico, whatsappConfigurado } from "@/lib/whatsapp";
import { Card, PageHeader } from "@/components/ui";
import { formatarDataHora, formatarTelefone } from "@/lib/format";
import { ResponderWhatsAppForm } from "@/components/ResponderWhatsAppForm";

export default async function WhatsAppConversaPage({
  params,
}: {
  params: Promise<{ telefone: string }>;
}) {
  const { telefone: canonico } = await params;

  const organizacao = await organizacaoAtual();
  if (!whatsappConfigurado(organizacao.whatsappPhoneId)) redirect("/dashboard");

  const todasMensagens = await prisma.mensagemWhatsApp.findMany({
    orderBy: { createdAt: "asc" },
    include: { cliente: { select: { id: true, nome: true } } },
  });
  const mensagens = todasMensagens.filter((m) => telefoneCanonico(m.telefone) === canonico);
  if (mensagens.length === 0) redirect("/whatsapp");

  const ultima = mensagens[mensagens.length - 1];
  const cliente = mensagens.find((m) => m.cliente)?.cliente ?? null;

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title={cliente?.nome || formatarTelefone(ultima.telefone)}
        subtitle={formatarTelefone(ultima.telefone)}
        actions={
          <Link href="/whatsapp" className="text-sm font-medium text-brand-600 hover:underline">
            ← Conversas
          </Link>
        }
      />

      <Card className="flex flex-col gap-3 p-4">
        {mensagens.map((msg) => (
          <div key={msg.id} className={`flex ${msg.direcao === "SAIDA" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                msg.direcao === "SAIDA" ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-900"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.corpo}</p>
              <p className={`mt-1 text-right text-[10px] ${msg.direcao === "SAIDA" ? "text-brand-100" : "text-slate-400"}`}>
                {formatarDataHora(msg.createdAt)}
              </p>
            </div>
          </div>
        ))}
      </Card>

      <Card className="p-4">
        <ResponderWhatsAppForm canonico={canonico} telefone={ultima.telefone} clienteId={cliente?.id ?? null} />
      </Card>
    </div>
  );
}

import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { organizacaoAtual } from "@/lib/tenant";
import { telefoneCanonico, whatsappConfigurado } from "@/lib/whatsapp";
import { Card, PageHeader } from "@/components/ui";
import { formatarDataHora, formatarTelefone } from "@/lib/format";
import { ResponderWhatsAppForm } from "@/components/ResponderWhatsAppForm";
import { MarcarConversaLida } from "@/components/MarcarConversaLida";

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
  const temNaoLidas = mensagens.some((m) => m.direcao === "ENTRADA" && !m.lidaEm);

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

      <MarcarConversaLida canonico={canonico} temNaoLidas={temNaoLidas} />

      <Card className="flex flex-col gap-3 p-4">
        {mensagens.map((msg) => (
          <div key={msg.id} className={`flex ${msg.direcao === "SAIDA" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                msg.direcao === "SAIDA" ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-900"
              }`}
            >
              {msg.midiaUrl && msg.midiaTipo && (
                <div className="mb-1">
                  {(msg.midiaTipo === "image" || msg.midiaTipo === "sticker") && (
                    // eslint-disable-next-line @next/next/no-img-element -- mídia do Storage; o otimizador de imagem não roda nesta arquitetura
                    <img src={msg.midiaUrl} alt={msg.corpo} className="max-h-72 rounded-md" />
                  )}
                  {msg.midiaTipo === "video" && <video src={msg.midiaUrl} controls className="max-h-72 rounded-md" />}
                  {msg.midiaTipo === "audio" && <audio src={msg.midiaUrl} controls className="max-w-full" />}
                  {msg.midiaTipo === "document" && (
                    <a href={msg.midiaUrl} target="_blank" rel="noreferrer" className="font-medium underline">
                      Abrir documento
                    </a>
                  )}
                </div>
              )}
              {(!msg.midiaUrl || (msg.corpo && !/^(📷 Foto|🎥 Vídeo|🎤 Áudio|📎 Documento|Figurinha)$/.test(msg.corpo))) && (
                <p className="whitespace-pre-wrap">{msg.corpo}</p>
              )}
              <p className={`mt-1 text-right text-[10px] ${msg.direcao === "SAIDA" ? "text-brand-100" : "text-slate-400"}`}>
                {formatarDataHora(msg.createdAt)}
                {msg.direcao === "SAIDA" &&
                  ` · ${{ ENVIADA: "Enviada", ENTREGUE: "Entregue", LIDA: "Lida", FALHOU: "Falhou" }[msg.status]}`}
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

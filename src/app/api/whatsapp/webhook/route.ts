import { NextRequest, NextResponse } from "next/server";
import { prismaBase } from "@/lib/prisma-base";
import { baixarMidiaWhatsApp, telefoneCanonico } from "@/lib/whatsapp";
import { salvarMidiaWhatsApp } from "@/lib/storage";

const MIDIA_ROTULO: Record<string, string> = {
  image: "📷 Foto",
  video: "🎥 Vídeo",
  audio: "🎤 Áudio",
  sticker: "Figurinha",
  document: "📎 Documento",
};

/**
 * Recebe eventos do WhatsApp encaminhados pelo webhook do Maytra (swift-api)
 * — o app da Meta é compartilhado entre os dois sistemas e só tem UMA URL de
 * callback, então o swift-api identifica pelo phone_number_id os eventos do
 * número do Garage Flow e repassa o payload original pra cá (ver comentário
 * no topo do index.ts do swift-api). Autenticação é por segredo compartilhado
 * no header, não por JWT de usuário — por isso essa rota é pública em
 * src/proxy.ts.
 */
export async function POST(req: NextRequest) {
  const segredoEsperado = process.env.WHATSAPP_WEBHOOK_RELAY_SECRET;
  const segredoRecebido = req.headers.get("x-relay-secret");
  if (!segredoEsperado || segredoRecebido !== segredoEsperado) {
    return NextResponse.json({ erro: "Segredo inválido." }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  if (!payload) return NextResponse.json({ ok: true });

  try {
    const value = payload?.entry?.[0]?.changes?.[0]?.value;
    const phoneNumberId: string | undefined = value?.metadata?.phone_number_id;
    if (!phoneNumberId) return NextResponse.json({ ok: true });

    const organizacao = await prismaBase.organizacao.findUnique({
      where: { whatsappPhoneId: phoneNumberId },
      select: { id: true },
    });
    if (!organizacao) return NextResponse.json({ ok: true });

    const STATUS_META: Record<string, string> = {
      sent: "ENVIADA",
      delivered: "ENTREGUE",
      read: "LIDA",
      failed: "FALHOU",
    };
    const statuses = value?.statuses;
    if (Array.isArray(statuses)) {
      for (const statusEntry of statuses) {
        const wamid = statusEntry?.id;
        const novoStatus = STATUS_META[String(statusEntry?.status || "")];
        console.log(
          `[whatsapp/webhook] status ${statusEntry?.status} wamid=${wamid} para=${statusEntry?.recipient_id}` +
            (statusEntry?.errors ? ` erro=${JSON.stringify(statusEntry.errors)}` : "")
        );
        if (!wamid || !novoStatus) continue;
        await prismaBase.mensagemWhatsApp
          .update({ where: { wamid }, data: { status: novoStatus as never } })
          .catch(() => null); // mensagem pode não existir (ex: evento antigo) — ignora
      }
    }

    const mensagens = value?.messages;
    if (Array.isArray(mensagens) && mensagens.length > 0) {
      const clientes = await prismaBase.cliente.findMany({
        where: { organizacaoId: organizacao.id, telefone: { not: null } },
        select: { id: true, telefone: true },
      });

      for (const msg of mensagens) {
        const de: string | undefined = msg?.from;
        if (!de) continue;
        const deCanonico = telefoneCanonico(de);
        const clienteEncontrado = clientes.find((c) => c.telefone && telefoneCanonico(c.telefone) === deCanonico);

        let corpo: string;
        let midiaUrl: string | undefined;
        let midiaTipo: string | undefined;
        if (msg.type === "text") {
          corpo = msg.text?.body || "[mensagem sem texto]";
        } else if (msg.type === "reaction") {
          corpo = msg.reaction?.emoji ? `Reagiu ${msg.reaction.emoji}` : "Reagiu a uma mensagem";
        } else if (["image", "video", "audio", "sticker", "document"].includes(msg.type)) {
          const midia = msg[msg.type] as { id?: string; caption?: string; filename?: string } | undefined;
          const rotulo = MIDIA_ROTULO[msg.type];
          corpo = midia?.caption || midia?.filename || rotulo;
          const baixada = midia?.id ? await baixarMidiaWhatsApp(midia.id) : null;
          if (baixada) {
            try {
              midiaUrl = await salvarMidiaWhatsApp(organizacao.id, baixada.bytes, baixada.contentType, baixada.extensao);
              midiaTipo = msg.type;
            } catch (erro) {
              console.error("[whatsapp/webhook] Falha ao guardar mídia:", erro);
            }
          }
          if (!midiaUrl) corpo = `${rotulo} (não foi possível baixar o arquivo)`;
        } else if (msg.type) {
          corpo = `[${msg.type}, sem suporte de visualização]`;
        } else {
          corpo = "[mensagem sem conteúdo]";
        }

        await prismaBase.mensagemWhatsApp.create({
          data: {
            organizacaoId: organizacao.id,
            telefone: de,
            clienteId: clienteEncontrado?.id,
            direcao: "ENTRADA",
            corpo,
            midiaUrl,
            midiaTipo,
            wamid: msg.id || null,
          },
        });
      }
    }
  } catch (erro) {
    console.error("[whatsapp/webhook] Falha ao processar evento encaminhado:", erro);
  }

  return NextResponse.json({ ok: true });
}

"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { organizacaoAtual, organizacaoIdAtual } from "@/lib/tenant";
import { salvarMidiaWhatsApp } from "@/lib/storage";
import {
  enviarMediaWhatsApp,
  enviarMidiaWhatsApp,
  enviarTextoLivreWhatsApp,
  enviarTemplateTextoWhatsApp,
  marcarMensagemComoLidaNaMeta,
  paraE164Brasil,
  telefoneCanonico,
  textoPedidoDeRetorno,
  tipoMidiaPorMime,
  WHATSAPP_TEMPLATES,
  whatsappConfigurado,
} from "@/lib/whatsapp";

export type EstadoRespostaWhatsApp = { erro?: string; enviadoEm?: number } | undefined;

const TAMANHO_MAXIMO_ANEXO = 10 * 1024 * 1024; // cabe no limite de 12MB das Server Actions

const ROTULO_MIDIA = {
  image: "📷 Foto",
  video: "🎥 Vídeo",
  audio: "🎤 Áudio",
  document: "📎 Documento",
} as const;

const EXTENSAO_POR_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "video/mp4": "mp4",
  "video/3gpp": "3gp",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/amr": "amr",
  "application/pdf": "pdf",
};

/**
 * Resposta manual na caixa de entrada — texto livre e/ou um anexo (foto,
 * vídeo, áudio ou documento). Só é entregue dentro da janela de 24h aberta
 * pelo último contato do cliente (ver src/lib/whatsapp.ts).
 */
export async function responderWhatsApp(
  canonico: string,
  telefone: string,
  clienteId: string | null,
  _prevState: EstadoRespostaWhatsApp,
  formData: FormData
): Promise<EstadoRespostaWhatsApp> {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const texto = String(formData.get("texto") || "").trim();
  const anexo = formData.get("anexo");
  const arquivo = anexo instanceof File && anexo.size > 0 ? anexo : null;
  if (!texto && !arquivo) return { erro: "Escreva uma mensagem ou anexe um arquivo." };
  if (arquivo && arquivo.size > TAMANHO_MAXIMO_ANEXO) return { erro: "Arquivo muito grande (máximo 10MB)." };

  const organizacao = await organizacaoAtual();
  const phoneId = organizacao.whatsappPhoneId;
  if (!phoneId || !whatsappConfigurado(phoneId)) {
    return { erro: "WhatsApp ainda não configurado pra essa conta." };
  }

  try {
    const organizacaoId = await organizacaoIdAtual();

    if (arquivo) {
      const mime = arquivo.type || "application/octet-stream";
      const tipo = tipoMidiaPorMime(mime);
      const bytes = Buffer.from(await arquivo.arrayBuffer());

      const mediaId = await enviarMediaWhatsApp(phoneId, bytes, arquivo.name, mime);
      const { wamid } = await enviarMidiaWhatsApp({
        phoneId,
        telefone,
        tipo,
        mediaId,
        nomeArquivo: arquivo.name,
        legenda: texto || undefined,
      });

      // Cópia no nosso Storage só pra mostrar o anexo na conversa; se falhar,
      // a mensagem já foi enviada e fica registrada sem a prévia.
      let midiaUrl: string | undefined;
      try {
        const extensao = EXTENSAO_POR_MIME[mime] || arquivo.name.split(".").pop() || "bin";
        midiaUrl = await salvarMidiaWhatsApp(organizacaoId, bytes, mime, extensao);
      } catch (erro) {
        console.error("[whatsapp] Não foi possível guardar o anexo enviado:", erro);
      }

      await prisma.mensagemWhatsApp.create({
        data: {
          organizacaoId,
          telefone,
          clienteId: clienteId || undefined,
          direcao: "SAIDA",
          corpo: texto || arquivo.name || ROTULO_MIDIA[tipo],
          midiaUrl,
          midiaTipo: midiaUrl ? tipo : undefined,
          wamid,
        },
      });
    } else {
      const { wamid } = await enviarTextoLivreWhatsApp(phoneId, telefone, texto);
      await prisma.mensagemWhatsApp.create({
        data: {
          organizacaoId,
          telefone,
          clienteId: clienteId || undefined,
          direcao: "SAIDA",
          corpo: texto,
          wamid,
        },
      });
    }
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Falha ao enviar mensagem.";
    return { erro: mensagem };
  }

  revalidatePath(`/whatsapp/${canonico}`);
  return { enviadoEm: Date.now() };
}

/**
 * Marca como lidas as mensagens recebidas dessa conversa (ao abri-la) e avisa
 * a Meta, pro cliente ver o "visto" azul.
 */
export async function marcarConversaComoLida(canonico: string): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const naoLidas = await prisma.mensagemWhatsApp.findMany({
    where: { direcao: "ENTRADA", lidaEm: null },
    select: { id: true, telefone: true, wamid: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  const daConversa = naoLidas.filter((m) => telefoneCanonico(m.telefone) === canonico);
  if (daConversa.length === 0) return;

  await prisma.mensagemWhatsApp.updateMany({
    where: { id: { in: daConversa.map((m) => m.id) } },
    data: { lidaEm: new Date() },
  });

  // Marcar a mais recente como lida na Meta já cobre as anteriores.
  const maisRecente = daConversa.find((m) => m.wamid);
  const organizacao = await organizacaoAtual();
  if (maisRecente?.wamid && organizacao.whatsappPhoneId && whatsappConfigurado(organizacao.whatsappPhoneId)) {
    await marcarMensagemComoLidaNaMeta(organizacao.whatsappPhoneId, maisRecente.wamid);
  }

  revalidatePath("/", "layout");
}

export type EstadoPedidoRetorno = { sucesso?: boolean; erro?: string } | undefined;

/**
 * Manda o template "contato_com_cliente": avisa que há um assunto do interesse
 * do cliente e pede que ele responda. É a forma de abrir conversa (ou
 * retomá-la depois das 24h) — quando ele responde, a janela livre reabre.
 */
export async function pedirRetornoWhatsApp(
  telefone: string,
  clienteId: string | null,
  nomeCliente: string,
  _prevState: EstadoPedidoRetorno,
  _formData: FormData
): Promise<EstadoPedidoRetorno> {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const organizacao = await organizacaoAtual();
  const phoneId = organizacao.whatsappPhoneId;
  if (!phoneId || !whatsappConfigurado(phoneId)) return { erro: "WhatsApp ainda não configurado pra essa conta." };
  if (!telefone.replace(/\D/g, "")) return { erro: "Esse cliente não tem telefone cadastrado." };

  const empresa = await prisma.empresaConfig.findFirst({ select: { nome: true } });
  const nomeEmpresa = empresa?.nome || organizacao.nome;
  const primeiroNome = nomeCliente.trim().split(/\s+/)[0] || "cliente";
  const destino = paraE164Brasil(telefone);
  const template = process.env.WHATSAPP_TEMPLATE_RETORNO || WHATSAPP_TEMPLATES.retorno;

  try {
    const { wamid } = await enviarTemplateTextoWhatsApp({
      phoneId,
      telefone: destino,
      template,
      variaveisCorpo: [primeiroNome, nomeEmpresa],
    });
    await prisma.mensagemWhatsApp.create({
      data: {
        organizacaoId: await organizacaoIdAtual(),
        telefone: destino,
        clienteId: clienteId || undefined,
        direcao: "SAIDA",
        corpo: textoPedidoDeRetorno(primeiroNome, nomeEmpresa),
        template,
        wamid,
      },
    });
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : "Falha ao enviar a mensagem." };
  }

  revalidatePath("/whatsapp");
  revalidatePath(`/whatsapp/${telefoneCanonico(destino)}`);
  return { sucesso: true };
}

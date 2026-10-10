"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { organizacaoAtual, organizacaoIdAtual } from "@/lib/tenant";
import { enviarTextoLivreWhatsApp, telefoneCanonico, whatsappConfigurado } from "@/lib/whatsapp";

export type EstadoRespostaWhatsApp = { erro?: string } | undefined;

/**
 * Resposta manual na caixa de entrada — texto livre, só é entregue dentro da
 * janela de 24h aberta pelo último contato do cliente (ver src/lib/whatsapp.ts).
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
  if (!texto) return { erro: "Escreva uma mensagem." };

  const organizacao = await organizacaoAtual();
  if (!whatsappConfigurado(organizacao.whatsappPhoneId)) {
    return { erro: "WhatsApp ainda não configurado pra essa conta." };
  }

  try {
    const { wamid } = await enviarTextoLivreWhatsApp(organizacao.whatsappPhoneId!, telefone, texto);
    await prisma.mensagemWhatsApp.create({
      data: {
        organizacaoId: await organizacaoIdAtual(),
        telefone,
        clienteId: clienteId || undefined,
        direcao: "SAIDA",
        corpo: texto,
        wamid,
      },
    });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Falha ao enviar mensagem.";
    return { erro: mensagem };
  }

  revalidatePath(`/whatsapp/${canonico}`);
  return undefined;
}

/** Marca como lidas as mensagens recebidas dessa conversa (ao abri-la). */
export async function marcarConversaComoLida(canonico: string): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const naoLidas = await prisma.mensagemWhatsApp.findMany({
    where: { direcao: "ENTRADA", lidaEm: null },
    select: { id: true, telefone: true },
  });
  const ids = naoLidas.filter((m) => telefoneCanonico(m.telefone) === canonico).map((m) => m.id);
  if (ids.length === 0) return;

  await prisma.mensagemWhatsApp.updateMany({ where: { id: { in: ids } }, data: { lidaEm: new Date() } });
  revalidatePath("/", "layout");
}

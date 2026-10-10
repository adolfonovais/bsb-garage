import webpush from "web-push";
import { prismaBase } from "@/lib/prisma-base";

// Notificações push (Web Push / VAPID) — avisam no celular ou no computador
// que chegou mensagem no WhatsApp, mesmo com o sistema fechado.
// Variáveis: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (e NEXT_PUBLIC_VAPID_PUBLIC_KEY,
// a mesma chave pública, que o navegador usa pra se inscrever).

export function pushConfigurado(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export async function enviarPushParaOrganizacao(
  organizacaoId: string,
  payload: { title: string; body: string; url: string; tag: string }
): Promise<void> {
  if (!pushConfigurado()) return;

  try {
    const inscricoes = await prismaBase.pushInscricao.findMany({ where: { organizacaoId } });
    if (inscricoes.length === 0) return;

    webpush.setVapidDetails(
      "mailto:suporte@garageflow.com.br",
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );

    await Promise.all(
      inscricoes.map(async (inscricao) => {
        try {
          await webpush.sendNotification(
            { endpoint: inscricao.endpoint, keys: { p256dh: inscricao.p256dh, auth: inscricao.auth } },
            JSON.stringify(payload)
          );
        } catch (erro) {
          const status = (erro as { statusCode?: number }).statusCode;
          // Navegador desinstalou/revogou a permissão: tira a inscrição morta.
          if (status === 404 || status === 410) {
            await prismaBase.pushInscricao.delete({ where: { id: inscricao.id } }).catch(() => null);
          } else {
            console.error("[push] Falha ao enviar notificação:", erro);
          }
        }
      })
    );
  } catch (erro) {
    console.error("[push] Erro inesperado:", erro);
  }
}

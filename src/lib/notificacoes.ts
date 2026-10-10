// Ponto único pra avisar o cliente quando a OS fica pronta, por e-mail e por
// WhatsApp (ver src/lib/whatsapp.ts) — quem chama notificarClienteOSConcluida
// não precisa saber por quais canais o aviso realmente saiu, nem se algum
// deles ainda não está configurado (cada função trata isso sozinha).

import { enviarEmailOSConcluida } from "@/lib/mail";
import { prismaBase } from "@/lib/prisma-base";
import { enviarWhatsAppOSConcluida } from "@/lib/whatsapp";

export async function notificarClienteOSConcluida(params: {
  paraEmail: string | null | undefined;
  paraTelefone: string | null | undefined;
  nomeCliente: string;
  numeroOS: string;
  nomeEmpresa: string;
  whatsappPhoneId: string | null | undefined;
  organizacaoId: string;
  clienteId: string;
}) {
  const [, whatsapp] = await Promise.all([
    enviarEmailOSConcluida({
      paraEmail: params.paraEmail,
      nomeCliente: params.nomeCliente,
      numeroOS: params.numeroOS,
      nomeEmpresa: params.nomeEmpresa,
    }),
    enviarWhatsAppOSConcluida({
      phoneId: params.whatsappPhoneId,
      paraTelefone: params.paraTelefone,
      nomeCliente: params.nomeCliente,
      numeroOS: params.numeroOS,
      nomeEmpresa: params.nomeEmpresa,
    }),
  ]);

  // Mensagem automática também aparece na conversa do cliente no sistema
  // (e recebe as atualizações de entregue/lida pelo wamid).
  if (whatsapp) {
    try {
      await prismaBase.mensagemWhatsApp.create({
        data: {
          organizacaoId: params.organizacaoId,
          telefone: whatsapp.telefone,
          clienteId: params.clienteId,
          direcao: "SAIDA",
          corpo: whatsapp.corpo,
          template: whatsapp.template,
          wamid: whatsapp.wamid,
        },
      });
    } catch (erro) {
      console.error("[whatsapp] Aviso enviado, mas não foi possível registrar na conversa:", erro);
    }
  }
}

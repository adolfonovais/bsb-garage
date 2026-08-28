// Ponto de extensão para aviso por WhatsApp (via Maytra / WhatsApp Business
// API). O app Maytra foi enviado para análise da Meta e ainda não foi
// aprovado — até lá, esta função só registra no log e não faz nada. Quando
// a aprovação sair, troque a implementação abaixo pela chamada real à API
// do WhatsApp Business (token e número de telefone em variáveis de
// ambiente, como já fazemos com SMTP em src/lib/mail.ts) — o restante do
// app (quem chama essa função) não precisa mudar.

export function whatsappConfigurado(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
}

export async function enviarWhatsAppOSConcluida(params: {
  paraTelefone: string | null | undefined;
  nomeCliente: string;
  numeroOS: string;
}): Promise<void> {
  const { paraTelefone, nomeCliente, numeroOS } = params;

  if (!whatsappConfigurado()) {
    console.log(
      `[whatsapp] Integração ainda não configurada (aguardando aprovação do Maytra) — aviso da OS ${numeroOS} não enviado por WhatsApp.`
    );
    return;
  }
  if (!paraTelefone) {
    console.log(`[whatsapp] Cliente "${nomeCliente}" sem telefone cadastrado — aviso da OS ${numeroOS} não enviado.`);
    return;
  }

  // TODO: chamar a API do WhatsApp Business (Maytra) quando estiver aprovada.
}

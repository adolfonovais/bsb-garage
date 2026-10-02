// Aviso por WhatsApp quando a OS fica pronta — via WhatsApp Cloud API da
// Meta, direto (sem BSP pago, mesma decisão de arquitetura do Maytra),
// reaproveitando o mesmo app aprovado pela Meta ("Maytra", App ID
// 1383439973235766 — mesmo CNPJ, Primea Gestão de Serviços LTDA), só que com
// um número de telefone dedicado ao Garage Flow/BSB Garage.
//
// Mensagem iniciada pela empresa (não é resposta a algo que o cliente
// mandou): fora da janela de 24h aberta pelo cliente, texto livre falha
// silenciosamente — por isso usamos um Template de Mensagem aprovado pela
// Meta (categoria Utilidade), igual o Maytra precisou fazer pra confirmação
// de reserva/lembrete de check-in (ver memória maytra-whatsapp-app-review).
//
// Variáveis de ambiente:
//   WHATSAPP_TOKEN              token de acesso (de um usuário do sistema no
//                                Meta Business Manager, com a permissão
//                                whatsapp_business_messaging já aprovada)
//   WHATSAPP_PHONE_ID           Phone Number ID do número registrado no
//                                WhatsApp Manager pra essa oficina
//   WHATSAPP_TEMPLATE_OS_PRONTA nome do template aprovado (padrão: abaixo)

const GRAPH_API_VERSION = "v21.0";
const TEMPLATE_PADRAO = "veiculo_pronto";

export function whatsappConfigurado(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
}

// Telefone cadastrado sem o DDI (55) é o caso mais comum no Brasil — a API
// exige o número completo em E.164 sem o "+" (ex: 5561999998888). Mesmo
// ajuste feito no Maytra depois de descobrir "Message undeliverable" por
// causa disso (ver memória).
function paraE164Brasil(telefone: string): string {
  const digitos = telefone.replace(/\D/g, "");
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  return digitos;
}

export async function enviarWhatsAppOSConcluida(params: {
  paraTelefone: string | null | undefined;
  nomeCliente: string;
  numeroOS: string;
  nomeEmpresa: string;
}): Promise<void> {
  const { paraTelefone, nomeCliente, numeroOS, nomeEmpresa } = params;

  if (!whatsappConfigurado()) {
    console.log(
      `[whatsapp] Integração ainda não configurada (WHATSAPP_TOKEN/WHATSAPP_PHONE_ID) — aviso da OS ${numeroOS} não enviado por WhatsApp.`
    );
    return;
  }
  if (!paraTelefone) {
    console.log(`[whatsapp] Cliente "${nomeCliente}" sem telefone cadastrado — aviso da OS ${numeroOS} não enviado por WhatsApp.`);
    return;
  }

  const telefone = paraE164Brasil(paraTelefone);
  const templateName = process.env.WHATSAPP_TEMPLATE_OS_PRONTA || TEMPLATE_PADRAO;

  try {
    const resposta = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${process.env.WHATSAPP_PHONE_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: telefone,
          type: "template",
          template: {
            name: templateName,
            language: { code: "pt_BR" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: nomeCliente },
                  { type: "text", text: numeroOS },
                  { type: "text", text: nomeEmpresa },
                ],
              },
            ],
          },
        }),
      }
    );

    if (!resposta.ok) {
      const corpo = await resposta.text();
      console.error(`[whatsapp] Falha ao enviar aviso da OS ${numeroOS} pra ${telefone} (HTTP ${resposta.status}):`, corpo);
      return;
    }
    console.log(`[whatsapp] Aviso da OS ${numeroOS} enviado por WhatsApp para ${telefone}.`);
  } catch (erro) {
    console.error(`[whatsapp] Erro de rede ao enviar aviso da OS ${numeroOS} por WhatsApp:`, erro);
  }
}

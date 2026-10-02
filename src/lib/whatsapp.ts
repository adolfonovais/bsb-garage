// Integração com WhatsApp via Meta Cloud API, direto (sem BSP pago, mesma
// decisão de arquitetura do Maytra), reaproveitando o mesmo app aprovado
// pela Meta ("Maytra", App ID 1383439973235766 — mesmo CNPJ, Primea Gestão
// de Serviços LTDA), com um número de telefone dedicado por organização
// (Organizacao.whatsappPhoneId).
//
// Mensagem iniciada pela empresa (aviso de OS pronta, envio de OS/orçamento/
// NF): fora da janela de 24h aberta pelo cliente, só funciona com um
// Template de Mensagem aprovado pela Meta (categoria Utilidade) — texto
// livre falha silenciosamente nesse caso (mesma lição aprendida no Maytra,
// ver memória maytra-whatsapp-app-review). Texto livre (usado na resposta
// manual da caixa de entrada) só é entregue dentro dessa janela.
//
// Variáveis de ambiente:
//   WHATSAPP_TOKEN                token de acesso (usuário do sistema no
//                                 Meta Business Manager, permissão já aprovada)
//   WHATSAPP_PHONE_ID             Phone Number ID padrão (organização sem
//                                 whatsappPhoneId próprio cadastrado cai aqui)
//   WHATSAPP_TEMPLATE_OS_PRONTA   nome do template do aviso de OS concluída
//   WHATSAPP_TEMPLATE_ENVIO_OS    nome do template de envio da OS em PDF
//   WHATSAPP_TEMPLATE_ENVIO_ORCAMENTO  idem, orçamento
//   WHATSAPP_TEMPLATE_ENVIO_NF    idem, NFS-e
//   WHATSAPP_WEBHOOK_VERIFY_TOKEN valor arbitrário definido aqui e no painel
//                                 da Meta, pra validar a assinatura do webhook

const GRAPH_API_VERSION = "v21.0";

const TEMPLATES_PADRAO = {
  osPronta: "veiculo_pronto",
  envioOs: "envio_os",
  envioOrcamento: "envio_orcamento",
  envioNf: "envio_nf",
};

export function whatsappConfigurado(phoneId?: string | null): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN && (phoneId || process.env.WHATSAPP_PHONE_ID));
}

// Telefone cadastrado sem o DDI (55) é o caso mais comum no Brasil — a API
// exige o número completo em E.164 sem o "+" (ex: 5561999998888). Mesmo
// ajuste feito no Maytra depois de descobrir "Message undeliverable" por
// causa disso (ver memória).
export function paraE164Brasil(telefone: string): string {
  const digitos = telefone.replace(/\D/g, "");
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  return digitos;
}

function graphUrl(phoneId: string, caminho: string): string {
  return `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneId}/${caminho}`;
}

async function chamarGraphApi(phoneId: string, caminho: string, body: unknown): Promise<unknown> {
  const resposta = await fetch(graphUrl(phoneId, caminho), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const corpo = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    const mensagem = (corpo as { error?: { message?: string } } | null)?.error?.message;
    throw new Error(`WhatsApp (HTTP ${resposta.status}): ${mensagem ?? JSON.stringify(corpo)}`);
  }
  return corpo;
}

/** Sobe um PDF pra Meta e devolve o media id, pra anexar numa mensagem de documento. */
export async function enviarMediaWhatsApp(phoneId: string, pdf: Buffer, nomeArquivo: string): Promise<string> {
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("file", new Blob([new Uint8Array(pdf)], { type: "application/pdf" }), nomeArquivo);

  const resposta = await fetch(graphUrl(phoneId, "media"), {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
    body: form,
  });
  const corpo = (await resposta.json().catch(() => null)) as { id?: string; error?: { message?: string } } | null;
  if (!resposta.ok || !corpo?.id) {
    throw new Error(`Falha ao enviar PDF pra Meta (HTTP ${resposta.status}): ${corpo?.error?.message ?? "resposta inesperada"}`);
  }
  return corpo.id;
}

/**
 * Manda um template com um PDF anexado no cabeçalho (envio de OS, orçamento
 * ou NF) + variáveis de texto no corpo. `mediaId` vem de enviarMediaWhatsApp.
 */
export async function enviarTemplateDocumentoWhatsApp(params: {
  phoneId: string;
  telefone: string;
  template: string;
  mediaId: string;
  nomeArquivo: string;
  variaveisCorpo: string[];
}): Promise<{ wamid: string | null }> {
  const resultado = (await chamarGraphApi(params.phoneId, "messages", {
    messaging_product: "whatsapp",
    to: params.telefone,
    type: "template",
    template: {
      name: params.template,
      language: { code: "pt_BR" },
      components: [
        {
          type: "header",
          parameters: [{ type: "document", document: { id: params.mediaId, filename: params.nomeArquivo } }],
        },
        {
          type: "body",
          parameters: params.variaveisCorpo.map((texto) => ({ type: "text", text: texto })),
        },
      ],
    },
  })) as { messages?: { id?: string }[] };
  return { wamid: resultado.messages?.[0]?.id ?? null };
}

/** Manda um template só de texto (sem anexo) — usado no aviso de OS concluída. */
export async function enviarTemplateTextoWhatsApp(params: {
  phoneId: string;
  telefone: string;
  template: string;
  variaveisCorpo: string[];
}): Promise<{ wamid: string | null }> {
  const resultado = (await chamarGraphApi(params.phoneId, "messages", {
    messaging_product: "whatsapp",
    to: params.telefone,
    type: "template",
    template: {
      name: params.template,
      language: { code: "pt_BR" },
      components: [{ type: "body", parameters: params.variaveisCorpo.map((texto) => ({ type: "text", text: texto })) }],
    },
  })) as { messages?: { id?: string }[] };
  return { wamid: resultado.messages?.[0]?.id ?? null };
}

/**
 * Texto livre, sem template — só é entregue dentro da janela de 24h aberta
 * pelo cliente (resposta manual na caixa de entrada). Fora da janela a Meta
 * recusa com um erro claro, que é repassado pra quem chamou.
 */
export async function enviarTextoLivreWhatsApp(phoneId: string, telefone: string, texto: string): Promise<{ wamid: string | null }> {
  const resultado = (await chamarGraphApi(phoneId, "messages", {
    messaging_product: "whatsapp",
    to: telefone,
    type: "text",
    text: { body: texto },
  })) as { messages?: { id?: string }[] };
  return { wamid: resultado.messages?.[0]?.id ?? null };
}

export async function enviarWhatsAppOSConcluida(params: {
  phoneId: string | null | undefined;
  paraTelefone: string | null | undefined;
  nomeCliente: string;
  numeroOS: string;
  nomeEmpresa: string;
}): Promise<void> {
  const { paraTelefone, nomeCliente, numeroOS, nomeEmpresa } = params;
  const phoneId = params.phoneId || process.env.WHATSAPP_PHONE_ID;

  if (!whatsappConfigurado(phoneId)) {
    console.log(
      `[whatsapp] Integração ainda não configurada (WHATSAPP_TOKEN/Phone Number ID) — aviso da OS ${numeroOS} não enviado por WhatsApp.`
    );
    return;
  }
  if (!paraTelefone) {
    console.log(`[whatsapp] Cliente "${nomeCliente}" sem telefone cadastrado — aviso da OS ${numeroOS} não enviado por WhatsApp.`);
    return;
  }

  try {
    await enviarTemplateTextoWhatsApp({
      phoneId: phoneId!,
      telefone: paraE164Brasil(paraTelefone),
      template: process.env.WHATSAPP_TEMPLATE_OS_PRONTA || TEMPLATES_PADRAO.osPronta,
      variaveisCorpo: [nomeCliente, numeroOS, nomeEmpresa],
    });
    console.log(`[whatsapp] Aviso da OS ${numeroOS} enviado por WhatsApp.`);
  } catch (erro) {
    console.error(`[whatsapp] Falha ao enviar aviso da OS ${numeroOS} por WhatsApp:`, erro);
  }
}

// Reduz um telefone (vindo da Meta ou do cadastro do cliente, com ou sem
// DDI/9º dígito) a DDD + 8 dígitos, pra comparar os dois lados sem depender
// de como cada um foi digitado. Mesma lógica usada no webhook do Maytra.
export function telefoneCanonico(numero: string): string {
  let digitos = (numero || "").replace(/\D/g, "");
  if (digitos.startsWith("55") && digitos.length >= 12) digitos = digitos.slice(2);
  if (digitos.length === 11 && digitos[2] === "9") digitos = digitos.slice(0, 2) + digitos.slice(3);
  return digitos;
}

export const WHATSAPP_TEMPLATES = TEMPLATES_PADRAO;

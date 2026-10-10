import { prisma } from "@/lib/prisma";
import { organizacaoAtual, organizacaoIdAtual } from "@/lib/tenant";
import { gerarPdfDeUrl } from "@/lib/pdf";
import { criarToken } from "@/lib/tokens";
import { urlBase } from "@/lib/mail";
import { enviarMediaWhatsApp, enviarTemplateDocumentoWhatsApp, paraE164Brasil, whatsappConfigurado } from "@/lib/whatsapp";

export type EstadoEnvioWhatsApp = { sucesso?: boolean; erro?: string } | undefined;
// Mesmo formato de _prevState/_formData do emitirNfseAction — pra usar com
// useActionState(acao.bind(null, id), undefined) nos botões "Enviar por WhatsApp".
export type AcaoEnvioWhatsApp = (prevState: EstadoEnvioWhatsApp, formData: FormData) => Promise<EstadoEnvioWhatsApp>;

/**
 * Gera o PDF de uma página de impressão do próprio app (via Chromium
 * headless, com um token interno de curta duração — ver
 * src/lib/doc-acesso.ts) e manda anexado no WhatsApp, usando o template
 * informado. Compartilhado entre "Enviar OS", "Enviar orçamento" e
 * "Enviar NF".
 */
export async function enviarPdfPorWhatsApp(params: {
  doc: "os" | "orcamento" | "nfse";
  id: string;
  caminhoImpressao: string;
  nomeArquivo: string;
  template: string;
  telefone: string | null;
  nomeCliente: string;
  numeroDocumento: string;
  clienteId: string;
}): Promise<EstadoEnvioWhatsApp> {
  const organizacao = await organizacaoAtual();
  const phoneId = organizacao.whatsappPhoneId;
  if (!whatsappConfigurado(phoneId)) {
    return { erro: "WhatsApp ainda não configurado pra essa conta (ver Configurações)." };
  }
  if (!params.telefone) {
    return { erro: "Esse cliente não tem telefone cadastrado." };
  }

  try {
    const token = criarToken({ t: "pdf-interno", doc: params.doc, id: params.id }, 5 * 60);
    const url = `${await urlBase()}${params.caminhoImpressao}?token=${token}`;
    const pdf = await gerarPdfDeUrl(url);
    const mediaId = await enviarMediaWhatsApp(phoneId!, pdf, params.nomeArquivo);
    const { wamid } = await enviarTemplateDocumentoWhatsApp({
      phoneId: phoneId!,
      telefone: paraE164Brasil(params.telefone),
      template: params.template,
      mediaId,
      nomeArquivo: params.nomeArquivo,
      variaveisCorpo: [params.nomeCliente, params.numeroDocumento],
    });

    await prisma.mensagemWhatsApp.create({
      data: {
        organizacaoId: await organizacaoIdAtual(),
        telefone: paraE164Brasil(params.telefone),
        clienteId: params.clienteId,
        direcao: "SAIDA",
        corpo: `📎 ${params.nomeArquivo} — ${params.numeroDocumento} enviado a ${params.nomeCliente}`,
        template: params.template,
        wamid,
      },
    });

    return { sucesso: true };
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Falha desconhecida ao enviar por WhatsApp.";
    console.error(`[whatsapp] Falha ao enviar ${params.nomeArquivo}:`, erro);
    return { erro: mensagem };
  }
}

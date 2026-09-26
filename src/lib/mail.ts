import nodemailer from "nodemailer";
import { headers } from "next/headers";
import { NOME_PLATAFORMA } from "@/lib/marca";

// Envio de e-mail (aviso de OS pronta, confirmação de cadastro, convites). Se
// o SMTP não estiver configurado no .env, as funções simplesmente não enviam
// nada — assim o resto do sistema continua funcionando mesmo antes de você
// configurar um servidor de e-mail (veja .env.example).

function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

export const smtpConfigurado = () => !!process.env.SMTP_HOST;

/** Endereço base do app (pra montar links nos e-mails) — do request atual, com fallback na env. */
export async function urlBase(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) return `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")}://${host}`;
  } catch {
    // fora de um request
  }
  return process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}

/** Envia um e-mail simples. Devolve true se saiu, false se SMTP ausente ou falhou. */
export async function enviarEmail(params: { para: string; assunto: string; texto: string }): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) {
    console.log(`[mail] SMTP não configurado — e-mail "${params.assunto}" para ${params.para} não enviado.`);
    return false;
  }
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || NOME_PLATAFORMA,
      to: params.para,
      subject: params.assunto,
      text: params.texto,
    });
    return true;
  } catch (erro) {
    console.error(`[mail] Falha ao enviar "${params.assunto}" para ${params.para}:`, erro);
    return false;
  }
}

export function enviarEmailConfirmacao(params: { para: string; nome: string; link: string }) {
  return enviarEmail({
    para: params.para,
    assunto: `Confirme seu e-mail — ${NOME_PLATAFORMA}`,
    texto: `Olá, ${params.nome}!\n\nPra ativar a sua conta no ${NOME_PLATAFORMA}, confirme o seu e-mail neste link (vale por 48 horas):\n\n${params.link}\n\nSe não foi você que criou a conta, é só ignorar esta mensagem.`,
  });
}

export function enviarEmailConvite(params: { para: string; nomeOrganizacao: string; convidadoPor: string; link: string }) {
  return enviarEmail({
    para: params.para,
    assunto: `${params.convidadoPor} convidou você para ${params.nomeOrganizacao}`,
    texto: `Olá!\n\n${params.convidadoPor} convidou você para usar o ${NOME_PLATAFORMA} na ${params.nomeOrganizacao}.\n\nPra aceitar e criar a sua senha, abra este link (vale por 7 dias):\n\n${params.link}\n\nSe você não esperava este convite, é só ignorar esta mensagem.`,
  });
}

export async function enviarEmailOSConcluida(params: {
  paraEmail: string | null | undefined;
  nomeCliente: string;
  numeroOS: string;
  nomeEmpresa: string;
}) {
  const { paraEmail, nomeCliente, numeroOS, nomeEmpresa } = params;

  if (!paraEmail) {
    console.log(`[mail] Cliente "${nomeCliente}" não tem e-mail cadastrado — aviso da OS ${numeroOS} não enviado.`);
    return;
  }

  const enviado = await enviarEmail({
    para: paraEmail,
    assunto: `Seu veículo está pronto! — ${nomeEmpresa}`,
    texto: `Olá, ${nomeCliente}!\n\nSeu veículo referente à Ordem de Serviço ${numeroOS} já está pronto para retirada na ${nomeEmpresa}.\n\nQualquer dúvida, entre em contato conosco.`,
  });
  if (enviado) console.log(`[mail] Aviso da OS ${numeroOS} enviado para ${paraEmail}.`);
}

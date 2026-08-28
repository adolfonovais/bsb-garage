import nodemailer from "nodemailer";

// Envio de e-mail (aviso ao cliente quando a OS fica pronta). Se o SMTP não
// estiver configurado no .env, a função simplesmente não envia nada — assim
// o resto do sistema continua funcionando mesmo antes de você configurar um
// servidor de e-mail (veja .env.example).

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

  const transporter = getTransporter();
  if (!transporter) {
    console.log(`[mail] SMTP não configurado (.env) — aviso da OS ${numeroOS} para ${paraEmail} não enviado.`);
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || nomeEmpresa,
      to: paraEmail,
      subject: `Seu veículo está pronto! — ${nomeEmpresa}`,
      text: `Olá, ${nomeCliente}!\n\nSeu veículo referente à Ordem de Serviço ${numeroOS} já está pronto para retirada na ${nomeEmpresa}.\n\nQualquer dúvida, entre em contato conosco.`,
    });
    console.log(`[mail] Aviso da OS ${numeroOS} enviado para ${paraEmail}.`);
  } catch (erro) {
    console.error(`[mail] Falha ao enviar aviso da OS ${numeroOS} para ${paraEmail}:`, erro);
  }
}

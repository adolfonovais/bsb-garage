// Ponto único pra avisar o cliente quando a OS fica pronta. Hoje só manda
// e-mail; o WhatsApp entra aqui também assim que o Maytra for aprovado
// (ver src/lib/whatsapp.ts) — quem chama notificarClienteOSConcluida não
// precisa saber por quais canais o aviso realmente saiu.

import { enviarEmailOSConcluida } from "@/lib/mail";
import { enviarWhatsAppOSConcluida } from "@/lib/whatsapp";

export async function notificarClienteOSConcluida(params: {
  paraEmail: string | null | undefined;
  paraTelefone: string | null | undefined;
  nomeCliente: string;
  numeroOS: string;
  nomeEmpresa: string;
}) {
  await Promise.all([
    enviarEmailOSConcluida({
      paraEmail: params.paraEmail,
      nomeCliente: params.nomeCliente,
      numeroOS: params.numeroOS,
      nomeEmpresa: params.nomeEmpresa,
    }),
    enviarWhatsAppOSConcluida({
      paraTelefone: params.paraTelefone,
      nomeCliente: params.nomeCliente,
      numeroOS: params.numeroOS,
    }),
  ]);
}

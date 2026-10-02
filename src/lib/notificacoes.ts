// Ponto único pra avisar o cliente quando a OS fica pronta, por e-mail e por
// WhatsApp (ver src/lib/whatsapp.ts) — quem chama notificarClienteOSConcluida
// não precisa saber por quais canais o aviso realmente saiu, nem se algum
// deles ainda não está configurado (cada função trata isso sozinha).

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
      nomeEmpresa: params.nomeEmpresa,
    }),
  ]);
}

// Marca o e-mail de um usuário como já verificado (pula a confirmação por
// e-mail) — pra contas que você mesmo cadastra ou quando o SMTP não entregou.
//
// Uso: npx tsx scripts/verificar-usuario.mts --email pessoa@exemplo.com
import "dotenv/config";
import { prismaBase } from "@/lib/prisma-base";

const i = process.argv.indexOf("--email");
const email = i >= 0 ? process.argv[i + 1]?.trim().toLowerCase() : undefined;
if (!email) {
  console.error("Uso: npx tsx scripts/verificar-usuario.mts --email pessoa@exemplo.com");
  process.exit(1);
}

const usuario = await prismaBase.usuario.findUnique({ where: { email } });
if (!usuario) {
  console.error(`Nenhum usuário com o e-mail ${email}.`);
  process.exit(1);
}
if (usuario.emailVerificadoEm) {
  console.log(`${email} já estava verificado.`);
} else {
  await prismaBase.usuario.update({ where: { id: usuario.id }, data: { emailVerificadoEm: new Date() } });
  console.log(`${email} marcado como verificado.`);
}
await prismaBase.$disconnect();

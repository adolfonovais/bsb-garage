// Cria uma organização (cliente da plataforma) + administrador direto no banco,
// SEM e-mail de confirmação — pra quando você mesmo cadastra alguém.
//
// Uso (na pasta do projeto):
//   npx tsx scripts/criar-organizacao.mts --nome "JL Pintura" --slug jlpintura \
//     --admin "Luan" --email luan@exemplo.com --cidade "Brasília - DF"
//
// Sem --senha, gera uma senha provisória aleatória e imprime UMA vez no final;
// com --senha "xxxx" usa a que você informar (mín. 6 caracteres). Em ambos os
// casos a pessoa pode trocar em "Minha conta". Lê DATABASE_URL do .env.
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { prismaBase } from "@/lib/prisma-base";
import { criarOrganizacaoComAdmin, gerarSlug } from "@/lib/nova-organizacao";

function arg(nome: string): string | undefined {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const nomeOficina = arg("nome");
const email = arg("email")?.trim().toLowerCase();
const nomeAdmin = arg("admin");
const cidadeUf = arg("cidade") ?? "Brasília - DF";
const slug = arg("slug") ?? (nomeOficina ? gerarSlug(nomeOficina, false) : undefined);

if (!nomeOficina || !email || !nomeAdmin) {
  console.error('Uso: npx tsx scripts/criar-organizacao.mts --nome "Oficina" --admin "Fulano" --email fulano@x.com [--slug oficina] [--cidade "Cidade - UF"]');
  process.exit(1);
}

if (await prismaBase.usuario.findUnique({ where: { email }, select: { id: true } })) {
  console.error(`Já existe um usuário com o e-mail ${email}. Nada foi criado.`);
  process.exit(1);
}
if (slug && (await prismaBase.organizacao.findUnique({ where: { slug }, select: { id: true } }))) {
  console.error(`Já existe uma organização com o slug "${slug}". Nada foi criado.`);
  process.exit(1);
}

const senhaInformada = arg("senha");
if (senhaInformada !== undefined && senhaInformada.length < 6) {
  console.error("A senha deve ter pelo menos 6 caracteres. Nada foi criado.");
  process.exit(1);
}
// Sem --senha: provisória legível (sem caracteres ambíguos), 12 caracteres.
const alfabeto = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const senha = senhaInformada ?? Array.from(randomBytes(12), (b) => alfabeto[b % alfabeto.length]).join("");

const org = await criarOrganizacaoComAdmin({
  nomeOficina,
  cidadeUf,
  nomeAdmin,
  email,
  senha,
  slug,
  origemCadastro: "manual",
  emailVerificado: true,
});

console.log(`Organização criada: ${org.nome} (slug ${org.slug}, id ${org.id})`);
console.log(`Administrador: ${nomeAdmin} <${email}>`);
console.log(senhaInformada ? "Senha: a que foi informada em --senha." : `Senha provisória: ${senha}`);
await prismaBase.$disconnect();

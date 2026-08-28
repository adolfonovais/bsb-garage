import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // ---- Usuário administrador ----
  const senhaAdmin = process.env.SEED_ADMIN_SENHA ?? "trocar123";
  const senhaHash = await bcrypt.hash(senhaAdmin, 10);

  const admin = await prisma.usuario.upsert({
    where: { email: "adolfo@bsbgarage.com.br" },
    update: {},
    create: {
      nome: "Adolfo Novais",
      email: "adolfo@bsbgarage.com.br",
      senhaHash,
      papel: "ADMIN",
    },
  });
  console.log(`Usuário admin: ${admin.email} / senha inicial: ${senhaAdmin}`);

  // ---- Configuração da empresa (dados extraídos do modelo de Orçamento atual) ----
  await prisma.empresaConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      nome: "BSB Garage Martelinho de Ouro",
      razaoSocial: "ADOLFO DE NOVAIS PINTO NETO ME",
      cnpj: "16.691.058/0001-69",
      ie: "07.618.885/001-53",
      telefones: "(61) 98194-6405 / (61) 98424-0111",
      cidadeUf: "Brasília - DF",
    },
  });

  // ---- Catálogo de serviços ----
  const tiposServico = [
    "Martelinho de Ouro",
    "Pintura",
    "Lanternagem",
    "Pintura c/ Lanternagem",
    "Polimento Geral",
    "Polimento Localizado",
    "Polimento de Faróis",
    "Vitrificação",
    "Higienização",
    "Alinhamento de Para-choque",
  ];
  for (const nome of tiposServico) {
    await prisma.tipoServico.upsert({
      where: { nome },
      update: {},
      create: { nome },
    });
  }

  // ---- Estoque de materiais (catálogo básico) ----
  const pecas: { nome: string; unidade: string; quantidadeMinima: number; custoUnitario: number }[] = [
    { nome: "Tinta preta metálica", unidade: "l", quantidadeMinima: 2, custoUnitario: 180 },
    { nome: "Massa plástica", unidade: "kg", quantidadeMinima: 5, custoUnitario: 35 },
    { nome: "Verniz automotivo", unidade: "l", quantidadeMinima: 2, custoUnitario: 150 },
    { nome: "Lixa 400", unidade: "un", quantidadeMinima: 20, custoUnitario: 3 },
  ];
  for (const p of pecas) {
    await prisma.peca.upsert({
      where: { nome: p.nome },
      update: {},
      create: { ...p, quantidadeAtual: p.quantidadeMinima * 2 },
    });
  }

  // ---- Oficina terceirizada de exemplo ----
  await prisma.oficinaTerceirizada.upsert({
    where: { nome: "JL Pintura" },
    update: {},
    create: { nome: "JL Pintura" },
  });

  // ---- Cliente + veículo de exemplo (só para dar uma base pra testar) ----
  const clienteExemplo = await prisma.cliente.upsert({
    where: { id: "cliente-exemplo-seed" },
    update: {},
    create: {
      id: "cliente-exemplo-seed",
      nome: "Cliente Exemplo",
      telefone: "(61) 99999-0000",
      email: "cliente.exemplo@email.com",
    },
  });

  await prisma.veiculo.upsert({
    where: { id: "veiculo-exemplo-seed" },
    update: {},
    create: {
      id: "veiculo-exemplo-seed",
      clienteId: clienteExemplo.id,
      modelo: "HB20",
      placa: "ABC1D23",
      cor: "Prata",
      ano: 2022,
    },
  });

  console.log("Seed concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

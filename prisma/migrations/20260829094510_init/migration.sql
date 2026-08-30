-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "bsb_garage";

-- CreateEnum
CREATE TYPE "bsb_garage"."PapelUsuario" AS ENUM ('ADMIN', 'FUNCIONARIO');

-- CreateEnum
CREATE TYPE "bsb_garage"."StatusOrcamento" AS ENUM ('PENDENTE', 'APROVADO', 'RECUSADO', 'EXPIRADO');

-- CreateEnum
CREATE TYPE "bsb_garage"."StatusOS" AS ENUM ('ABERTA', 'EM_ANDAMENTO', 'AGUARDANDO_PECA', 'CONCLUIDA', 'ENTREGUE', 'CANCELADA');

-- CreateEnum
CREATE TYPE "bsb_garage"."TipoFoto" AS ENUM ('ANTES', 'DEPOIS');

-- CreateEnum
CREATE TYPE "bsb_garage"."StatusRepasse" AS ENUM ('EM_ANDAMENTO', 'ENTREGUE', 'CANCELADO');

-- CreateEnum
CREATE TYPE "bsb_garage"."StatusPagamentoOficina" AS ENUM ('PENDENTE', 'PAGO');

-- CreateEnum
CREATE TYPE "bsb_garage"."TipoMovimentoEstoque" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateEnum
CREATE TYPE "bsb_garage"."TipoConta" AS ENUM ('PAGAR', 'RECEBER');

-- CreateEnum
CREATE TYPE "bsb_garage"."StatusConta" AS ENUM ('ABERTA', 'PAGA', 'ATRASADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "bsb_garage"."Usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "papel" "bsb_garage"."PapelUsuario" NOT NULL DEFAULT 'FUNCIONARIO',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bsb_garage"."Cliente" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT,
    "email" TEXT,
    "endereco" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bsb_garage"."Veiculo" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "placa" TEXT,
    "cor" TEXT,
    "ano" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Veiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bsb_garage"."TipoServico" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "precoBase" DECIMAL(10,2),
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TipoServico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bsb_garage"."Contador" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "ultimo" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Contador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bsb_garage"."Orcamento" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "clienteId" TEXT NOT NULL,
    "veiculoId" TEXT,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validadeDias" INTEGER NOT NULL DEFAULT 30,
    "status" "bsb_garage"."StatusOrcamento" NOT NULL DEFAULT 'PENDENTE',
    "observacoes" TEXT,
    "valorTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "criadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Orcamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bsb_garage"."OrcamentoItem" (
    "id" TEXT NOT NULL,
    "orcamentoId" TEXT NOT NULL,
    "tipoServicoId" TEXT,
    "descricao" TEXT NOT NULL,
    "quantidade" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "valorUnit" DECIMAL(10,2) NOT NULL,
    "valorTotal" DECIMAL(10,2) NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OrcamentoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bsb_garage"."OrdemServico" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "origemOrcamentoId" TEXT,
    "clienteId" TEXT NOT NULL,
    "veiculoId" TEXT,
    "dataEntrada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataSaidaPrevista" TIMESTAMP(3),
    "dataSaidaReal" TIMESTAMP(3),
    "status" "bsb_garage"."StatusOS" NOT NULL DEFAULT 'ABERTA',
    "formaPagamento" TEXT,
    "valorTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "oficinaTerceirizadaId" TEXT,
    "observacoes" TEXT,
    "criadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrdemServico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bsb_garage"."OrdemServicoItem" (
    "id" TEXT NOT NULL,
    "osId" TEXT NOT NULL,
    "tipoServicoId" TEXT,
    "descricao" TEXT NOT NULL,
    "quantidade" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "valorUnit" DECIMAL(10,2) NOT NULL,
    "valorTotal" DECIMAL(10,2) NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OrdemServicoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bsb_garage"."Pagamento" (
    "id" TEXT NOT NULL,
    "osId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "descricao" TEXT,
    "valor" DECIMAL(10,2) NOT NULL,
    "formaPagamento" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bsb_garage"."FotoOS" (
    "id" TEXT NOT NULL,
    "osId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tipo" "bsb_garage"."TipoFoto" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FotoOS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bsb_garage"."OficinaTerceirizada" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "contato" TEXT,
    "telefone" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "OficinaTerceirizada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bsb_garage"."RepasseOficina" (
    "id" TEXT NOT NULL,
    "oficinaId" TEXT NOT NULL,
    "osId" TEXT,
    "dataEntrada" TIMESTAMP(3) NOT NULL,
    "dataSaida" TIMESTAMP(3),
    "carro" TEXT NOT NULL,
    "placa" TEXT,
    "tipoServico" TEXT NOT NULL,
    "qtdPecas" INTEGER NOT NULL DEFAULT 1,
    "servicoAdicional" TEXT,
    "valorCobrado" DECIMAL(10,2) NOT NULL,
    "custoOficina" DECIMAL(10,2) NOT NULL,
    "outrosCustos" DECIMAL(10,2),
    "polimento" BOOLEAN NOT NULL DEFAULT false,
    "custoTotal" DECIMAL(10,2) NOT NULL,
    "lucro" DECIMAL(10,2) NOT NULL,
    "status" "bsb_garage"."StatusRepasse" NOT NULL DEFAULT 'EM_ANDAMENTO',
    "statusPagamentoOficina" "bsb_garage"."StatusPagamentoOficina" NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepasseOficina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bsb_garage"."Peca" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "unidade" TEXT NOT NULL DEFAULT 'un',
    "quantidadeAtual" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "quantidadeMinima" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "custoUnitario" DECIMAL(10,2),

    CONSTRAINT "Peca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bsb_garage"."MovimentacaoEstoque" (
    "id" TEXT NOT NULL,
    "pecaId" TEXT NOT NULL,
    "tipo" "bsb_garage"."TipoMovimentoEstoque" NOT NULL,
    "quantidade" DECIMAL(10,2) NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "osId" TEXT,
    "observacao" TEXT,

    CONSTRAINT "MovimentacaoEstoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bsb_garage"."ContaFinanceira" (
    "id" TEXT NOT NULL,
    "tipo" "bsb_garage"."TipoConta" NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "dataPagamento" TIMESTAMP(3),
    "status" "bsb_garage"."StatusConta" NOT NULL DEFAULT 'ABERTA',
    "categoria" TEXT,
    "osId" TEXT,
    "repasseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContaFinanceira_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bsb_garage"."EmpresaConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "nome" TEXT NOT NULL DEFAULT 'BSB Garage Martelinho de Ouro',
    "razaoSocial" TEXT,
    "cnpj" TEXT,
    "ie" TEXT,
    "telefones" TEXT,
    "endereco" TEXT,
    "cidadeUf" TEXT NOT NULL DEFAULT 'Brasília - DF',

    CONSTRAINT "EmpresaConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "bsb_garage"."Usuario"("email");

-- CreateIndex
CREATE INDEX "Cliente_nome_idx" ON "bsb_garage"."Cliente"("nome");

-- CreateIndex
CREATE INDEX "Veiculo_placa_idx" ON "bsb_garage"."Veiculo"("placa");

-- CreateIndex
CREATE INDEX "Veiculo_clienteId_idx" ON "bsb_garage"."Veiculo"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "TipoServico_nome_key" ON "bsb_garage"."TipoServico"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Contador_chave_ano_key" ON "bsb_garage"."Contador"("chave", "ano");

-- CreateIndex
CREATE UNIQUE INDEX "Orcamento_ano_numero_key" ON "bsb_garage"."Orcamento"("ano", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "OrdemServico_ano_numero_key" ON "bsb_garage"."OrdemServico"("ano", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "OficinaTerceirizada_nome_key" ON "bsb_garage"."OficinaTerceirizada"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Peca_nome_key" ON "bsb_garage"."Peca"("nome");

-- AddForeignKey
ALTER TABLE "bsb_garage"."Veiculo" ADD CONSTRAINT "Veiculo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "bsb_garage"."Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bsb_garage"."Orcamento" ADD CONSTRAINT "Orcamento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "bsb_garage"."Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bsb_garage"."Orcamento" ADD CONSTRAINT "Orcamento_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "bsb_garage"."Veiculo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bsb_garage"."Orcamento" ADD CONSTRAINT "Orcamento_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "bsb_garage"."Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bsb_garage"."OrcamentoItem" ADD CONSTRAINT "OrcamentoItem_orcamentoId_fkey" FOREIGN KEY ("orcamentoId") REFERENCES "bsb_garage"."Orcamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bsb_garage"."OrcamentoItem" ADD CONSTRAINT "OrcamentoItem_tipoServicoId_fkey" FOREIGN KEY ("tipoServicoId") REFERENCES "bsb_garage"."TipoServico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bsb_garage"."OrdemServico" ADD CONSTRAINT "OrdemServico_origemOrcamentoId_fkey" FOREIGN KEY ("origemOrcamentoId") REFERENCES "bsb_garage"."Orcamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bsb_garage"."OrdemServico" ADD CONSTRAINT "OrdemServico_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "bsb_garage"."Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bsb_garage"."OrdemServico" ADD CONSTRAINT "OrdemServico_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "bsb_garage"."Veiculo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bsb_garage"."OrdemServico" ADD CONSTRAINT "OrdemServico_oficinaTerceirizadaId_fkey" FOREIGN KEY ("oficinaTerceirizadaId") REFERENCES "bsb_garage"."OficinaTerceirizada"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bsb_garage"."OrdemServico" ADD CONSTRAINT "OrdemServico_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "bsb_garage"."Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bsb_garage"."OrdemServicoItem" ADD CONSTRAINT "OrdemServicoItem_osId_fkey" FOREIGN KEY ("osId") REFERENCES "bsb_garage"."OrdemServico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bsb_garage"."OrdemServicoItem" ADD CONSTRAINT "OrdemServicoItem_tipoServicoId_fkey" FOREIGN KEY ("tipoServicoId") REFERENCES "bsb_garage"."TipoServico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bsb_garage"."Pagamento" ADD CONSTRAINT "Pagamento_osId_fkey" FOREIGN KEY ("osId") REFERENCES "bsb_garage"."OrdemServico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bsb_garage"."FotoOS" ADD CONSTRAINT "FotoOS_osId_fkey" FOREIGN KEY ("osId") REFERENCES "bsb_garage"."OrdemServico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bsb_garage"."RepasseOficina" ADD CONSTRAINT "RepasseOficina_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "bsb_garage"."OficinaTerceirizada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bsb_garage"."RepasseOficina" ADD CONSTRAINT "RepasseOficina_osId_fkey" FOREIGN KEY ("osId") REFERENCES "bsb_garage"."OrdemServico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bsb_garage"."MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_pecaId_fkey" FOREIGN KEY ("pecaId") REFERENCES "bsb_garage"."Peca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bsb_garage"."MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_osId_fkey" FOREIGN KEY ("osId") REFERENCES "bsb_garage"."OrdemServico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bsb_garage"."ContaFinanceira" ADD CONSTRAINT "ContaFinanceira_osId_fkey" FOREIGN KEY ("osId") REFERENCES "bsb_garage"."OrdemServico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bsb_garage"."ContaFinanceira" ADD CONSTRAINT "ContaFinanceira_repasseId_fkey" FOREIGN KEY ("repasseId") REFERENCES "bsb_garage"."RepasseOficina"("id") ON DELETE SET NULL ON UPDATE CASCADE;

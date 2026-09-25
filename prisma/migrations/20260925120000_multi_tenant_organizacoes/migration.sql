-- Multi-tenant (etapa 1/2 — "expandir"): cada cliente da plataforma vira uma
-- Organizacao. Os dados existentes (BSB Garage) passam a pertencer à
-- organização #1. Compatível com o código antigo (que ainda não conhece
-- organizacaoId): as colunas têm DEFAULT temporário e os índices únicos antigos
-- continuam existindo; a etapa 2 (contrair) remove os dois depois do deploy.

CREATE TABLE "bsb_garage"."Organizacao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "plano" TEXT NOT NULL DEFAULT 'trial',
    "trialTerminaEm" TIMESTAMP(3),
    "nfseHabilitada" BOOLEAN NOT NULL DEFAULT false,
    "origemCadastro" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organizacao_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Organizacao_slug_key" ON "bsb_garage"."Organizacao"("slug");

-- Organização #1: BSB Garage (dona do certificado/NFS-e da Primea).
INSERT INTO "bsb_garage"."Organizacao" ("id", "nome", "slug", "plano", "nfseHabilitada", "origemCadastro")
VALUES ('org_bsb_garage', 'BSB Garage Martelinho de Ouro', 'bsb-garage', 'interno', true, 'migracao');

-- Usuario
ALTER TABLE "bsb_garage"."Usuario" ADD COLUMN "organizacaoId" TEXT NOT NULL DEFAULT 'org_bsb_garage';
CREATE INDEX "Usuario_organizacaoId_idx" ON "bsb_garage"."Usuario"("organizacaoId");
ALTER TABLE "bsb_garage"."Usuario" ADD CONSTRAINT "Usuario_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "bsb_garage"."Organizacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Cliente
ALTER TABLE "bsb_garage"."Cliente" ADD COLUMN "organizacaoId" TEXT NOT NULL DEFAULT 'org_bsb_garage';
CREATE INDEX "Cliente_organizacaoId_idx" ON "bsb_garage"."Cliente"("organizacaoId");
ALTER TABLE "bsb_garage"."Cliente" ADD CONSTRAINT "Cliente_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "bsb_garage"."Organizacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Veiculo
ALTER TABLE "bsb_garage"."Veiculo" ADD COLUMN "organizacaoId" TEXT NOT NULL DEFAULT 'org_bsb_garage';
CREATE INDEX "Veiculo_organizacaoId_idx" ON "bsb_garage"."Veiculo"("organizacaoId");
ALTER TABLE "bsb_garage"."Veiculo" ADD CONSTRAINT "Veiculo_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "bsb_garage"."Organizacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- TipoServico
ALTER TABLE "bsb_garage"."TipoServico" ADD COLUMN "organizacaoId" TEXT NOT NULL DEFAULT 'org_bsb_garage';
CREATE INDEX "TipoServico_organizacaoId_idx" ON "bsb_garage"."TipoServico"("organizacaoId");
ALTER TABLE "bsb_garage"."TipoServico" ADD CONSTRAINT "TipoServico_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "bsb_garage"."Organizacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Contador
ALTER TABLE "bsb_garage"."Contador" ADD COLUMN "organizacaoId" TEXT NOT NULL DEFAULT 'org_bsb_garage';
CREATE INDEX "Contador_organizacaoId_idx" ON "bsb_garage"."Contador"("organizacaoId");
ALTER TABLE "bsb_garage"."Contador" ADD CONSTRAINT "Contador_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "bsb_garage"."Organizacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Orcamento
ALTER TABLE "bsb_garage"."Orcamento" ADD COLUMN "organizacaoId" TEXT NOT NULL DEFAULT 'org_bsb_garage';
CREATE INDEX "Orcamento_organizacaoId_idx" ON "bsb_garage"."Orcamento"("organizacaoId");
ALTER TABLE "bsb_garage"."Orcamento" ADD CONSTRAINT "Orcamento_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "bsb_garage"."Organizacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- OrdemServico
ALTER TABLE "bsb_garage"."OrdemServico" ADD COLUMN "organizacaoId" TEXT NOT NULL DEFAULT 'org_bsb_garage';
CREATE INDEX "OrdemServico_organizacaoId_idx" ON "bsb_garage"."OrdemServico"("organizacaoId");
ALTER TABLE "bsb_garage"."OrdemServico" ADD CONSTRAINT "OrdemServico_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "bsb_garage"."Organizacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- OficinaTerceirizada
ALTER TABLE "bsb_garage"."OficinaTerceirizada" ADD COLUMN "organizacaoId" TEXT NOT NULL DEFAULT 'org_bsb_garage';
CREATE INDEX "OficinaTerceirizada_organizacaoId_idx" ON "bsb_garage"."OficinaTerceirizada"("organizacaoId");
ALTER TABLE "bsb_garage"."OficinaTerceirizada" ADD CONSTRAINT "OficinaTerceirizada_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "bsb_garage"."Organizacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RepasseOficina
ALTER TABLE "bsb_garage"."RepasseOficina" ADD COLUMN "organizacaoId" TEXT NOT NULL DEFAULT 'org_bsb_garage';
CREATE INDEX "RepasseOficina_organizacaoId_idx" ON "bsb_garage"."RepasseOficina"("organizacaoId");
ALTER TABLE "bsb_garage"."RepasseOficina" ADD CONSTRAINT "RepasseOficina_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "bsb_garage"."Organizacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Peca
ALTER TABLE "bsb_garage"."Peca" ADD COLUMN "organizacaoId" TEXT NOT NULL DEFAULT 'org_bsb_garage';
CREATE INDEX "Peca_organizacaoId_idx" ON "bsb_garage"."Peca"("organizacaoId");
ALTER TABLE "bsb_garage"."Peca" ADD CONSTRAINT "Peca_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "bsb_garage"."Organizacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- MovimentacaoEstoque
ALTER TABLE "bsb_garage"."MovimentacaoEstoque" ADD COLUMN "organizacaoId" TEXT NOT NULL DEFAULT 'org_bsb_garage';
CREATE INDEX "MovimentacaoEstoque_organizacaoId_idx" ON "bsb_garage"."MovimentacaoEstoque"("organizacaoId");
ALTER TABLE "bsb_garage"."MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "bsb_garage"."Organizacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ContaFinanceira
ALTER TABLE "bsb_garage"."ContaFinanceira" ADD COLUMN "organizacaoId" TEXT NOT NULL DEFAULT 'org_bsb_garage';
CREATE INDEX "ContaFinanceira_organizacaoId_idx" ON "bsb_garage"."ContaFinanceira"("organizacaoId");
ALTER TABLE "bsb_garage"."ContaFinanceira" ADD CONSTRAINT "ContaFinanceira_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "bsb_garage"."Organizacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Unicidade por organização (os índices únicos antigos saem na etapa 2)
CREATE UNIQUE INDEX "TipoServico_organizacaoId_nome_key" ON "bsb_garage"."TipoServico"("organizacaoId", "nome");

CREATE UNIQUE INDEX "OficinaTerceirizada_organizacaoId_nome_key" ON "bsb_garage"."OficinaTerceirizada"("organizacaoId", "nome");

CREATE UNIQUE INDEX "Peca_organizacaoId_nome_key" ON "bsb_garage"."Peca"("organizacaoId", "nome");

CREATE UNIQUE INDEX "Contador_organizacaoId_chave_ano_key" ON "bsb_garage"."Contador"("organizacaoId", "chave", "ano");

CREATE UNIQUE INDEX "Orcamento_organizacaoId_ano_numero_key" ON "bsb_garage"."Orcamento"("organizacaoId", "ano", "numero");

CREATE UNIQUE INDEX "OrdemServico_organizacaoId_ano_numero_key" ON "bsb_garage"."OrdemServico"("organizacaoId", "ano", "numero");

-- EmpresaConfig: deixa de ser singleton (id = 1) e passa a ser uma linha por organização
ALTER TABLE "bsb_garage"."EmpresaConfig" ADD COLUMN "organizacaoId" TEXT NOT NULL DEFAULT 'org_bsb_garage';
CREATE UNIQUE INDEX "EmpresaConfig_organizacaoId_key" ON "bsb_garage"."EmpresaConfig"("organizacaoId");
ALTER TABLE "bsb_garage"."EmpresaConfig" ADD CONSTRAINT "EmpresaConfig_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "bsb_garage"."Organizacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE SEQUENCE "bsb_garage"."EmpresaConfig_id_seq" OWNED BY "bsb_garage"."EmpresaConfig"."id";
SELECT setval('"bsb_garage"."EmpresaConfig_id_seq"', COALESCE((SELECT MAX("id") FROM "bsb_garage"."EmpresaConfig"), 1));
ALTER TABLE "bsb_garage"."EmpresaConfig" ALTER COLUMN "id" SET DEFAULT nextval('"bsb_garage"."EmpresaConfig_id_seq"');

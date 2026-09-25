-- Multi-tenant (etapa 2/2 — "contrair"): roda depois que o código novo está no ar.
-- Remove os DEFAULTs temporários de organizacaoId e os índices únicos antigos
-- (globais), que passam a valer só por organização.

ALTER TABLE "bsb_garage"."Usuario" ALTER COLUMN "organizacaoId" DROP DEFAULT;
ALTER TABLE "bsb_garage"."Cliente" ALTER COLUMN "organizacaoId" DROP DEFAULT;
ALTER TABLE "bsb_garage"."Veiculo" ALTER COLUMN "organizacaoId" DROP DEFAULT;
ALTER TABLE "bsb_garage"."TipoServico" ALTER COLUMN "organizacaoId" DROP DEFAULT;
ALTER TABLE "bsb_garage"."Contador" ALTER COLUMN "organizacaoId" DROP DEFAULT;
ALTER TABLE "bsb_garage"."Orcamento" ALTER COLUMN "organizacaoId" DROP DEFAULT;
ALTER TABLE "bsb_garage"."OrdemServico" ALTER COLUMN "organizacaoId" DROP DEFAULT;
ALTER TABLE "bsb_garage"."OficinaTerceirizada" ALTER COLUMN "organizacaoId" DROP DEFAULT;
ALTER TABLE "bsb_garage"."RepasseOficina" ALTER COLUMN "organizacaoId" DROP DEFAULT;
ALTER TABLE "bsb_garage"."Peca" ALTER COLUMN "organizacaoId" DROP DEFAULT;
ALTER TABLE "bsb_garage"."MovimentacaoEstoque" ALTER COLUMN "organizacaoId" DROP DEFAULT;
ALTER TABLE "bsb_garage"."ContaFinanceira" ALTER COLUMN "organizacaoId" DROP DEFAULT;
ALTER TABLE "bsb_garage"."EmpresaConfig" ALTER COLUMN "organizacaoId" DROP DEFAULT;

DROP INDEX "bsb_garage"."TipoServico_nome_key";
DROP INDEX "bsb_garage"."OficinaTerceirizada_nome_key";
DROP INDEX "bsb_garage"."Peca_nome_key";
DROP INDEX "bsb_garage"."Contador_chave_ano_key";
DROP INDEX "bsb_garage"."Orcamento_ano_numero_key";
DROP INDEX "bsb_garage"."OrdemServico_ano_numero_key";

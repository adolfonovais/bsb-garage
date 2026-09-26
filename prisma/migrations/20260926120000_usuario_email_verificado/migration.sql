-- Verificação de e-mail: usuários existentes contam como já verificados.
ALTER TABLE "bsb_garage"."Usuario" ADD COLUMN "emailVerificadoEm" TIMESTAMP(3);
UPDATE "bsb_garage"."Usuario" SET "emailVerificadoEm" = "createdAt";

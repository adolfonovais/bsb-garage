ALTER TABLE "bsb_garage"."Cliente"
  DROP COLUMN "endereco",
  ADD COLUMN "cidade" TEXT,
  ADD COLUMN "uf" TEXT;

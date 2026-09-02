ALTER TABLE "bsb_garage"."OrdemServico"
  ADD COLUMN "nfseChaveAcesso" TEXT,
  ADD COLUMN "nfseSerie" TEXT,
  ADD COLUMN "nfseNumero" INTEGER,
  ADD COLUMN "nfseXml" TEXT,
  ADD COLUMN "nfseEmitidaEm" TIMESTAMP(3),
  ADD COLUMN "nfseAmbiente" TEXT,
  ADD COLUMN "nfseErro" TEXT;

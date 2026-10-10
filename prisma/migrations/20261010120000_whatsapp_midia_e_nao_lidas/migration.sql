-- WhatsApp: mídia recebida (foto/áudio/vídeo/documento) e controle de lidas.
ALTER TABLE "bsb_garage"."MensagemWhatsApp" ADD COLUMN "midiaUrl" TEXT;
ALTER TABLE "bsb_garage"."MensagemWhatsApp" ADD COLUMN "midiaTipo" TEXT;
ALTER TABLE "bsb_garage"."MensagemWhatsApp" ADD COLUMN "lidaEm" TIMESTAMP(3);

-- Tudo que já existe foi visto antes desse controle: só as novas ficam como não lidas.
UPDATE "bsb_garage"."MensagemWhatsApp" SET "lidaEm" = CURRENT_TIMESTAMP WHERE "direcao" = 'ENTRADA';

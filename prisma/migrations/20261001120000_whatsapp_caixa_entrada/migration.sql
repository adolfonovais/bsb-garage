-- WhatsApp: Phone Number ID por organização (roteia o webhook pra org certa)
-- e histórico de mensagens (caixa de entrada).

ALTER TABLE "bsb_garage"."Organizacao" ADD COLUMN "whatsappPhoneId" TEXT;
CREATE UNIQUE INDEX "Organizacao_whatsappPhoneId_key" ON "bsb_garage"."Organizacao"("whatsappPhoneId");

CREATE TYPE "bsb_garage"."DirecaoMensagemWhatsApp" AS ENUM ('ENTRADA', 'SAIDA');
CREATE TYPE "bsb_garage"."StatusMensagemWhatsApp" AS ENUM ('ENVIADA', 'ENTREGUE', 'LIDA', 'FALHOU');

CREATE TABLE "bsb_garage"."MensagemWhatsApp" (
    "id" TEXT NOT NULL,
    "organizacaoId" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "clienteId" TEXT,
    "direcao" "bsb_garage"."DirecaoMensagemWhatsApp" NOT NULL,
    "corpo" TEXT NOT NULL,
    "template" TEXT,
    "status" "bsb_garage"."StatusMensagemWhatsApp" NOT NULL DEFAULT 'ENVIADA',
    "wamid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MensagemWhatsApp_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MensagemWhatsApp_wamid_key" ON "bsb_garage"."MensagemWhatsApp"("wamid");
CREATE INDEX "MensagemWhatsApp_organizacaoId_telefone_idx" ON "bsb_garage"."MensagemWhatsApp"("organizacaoId", "telefone");

ALTER TABLE "bsb_garage"."MensagemWhatsApp" ADD CONSTRAINT "MensagemWhatsApp_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "bsb_garage"."Organizacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bsb_garage"."MensagemWhatsApp" ADD CONSTRAINT "MensagemWhatsApp_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "bsb_garage"."Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

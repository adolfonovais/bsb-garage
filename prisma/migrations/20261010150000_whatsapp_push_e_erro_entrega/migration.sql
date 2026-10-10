-- WhatsApp: motivo da falha de entrega e inscrições de notificação push.
ALTER TABLE "bsb_garage"."MensagemWhatsApp" ADD COLUMN "erro" TEXT;

CREATE TABLE "bsb_garage"."PushInscricao" (
    "id" TEXT NOT NULL,
    "organizacaoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushInscricao_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PushInscricao_endpoint_key" ON "bsb_garage"."PushInscricao"("endpoint");
CREATE INDEX "PushInscricao_organizacaoId_idx" ON "bsb_garage"."PushInscricao"("organizacaoId");

ALTER TABLE "bsb_garage"."PushInscricao" ADD CONSTRAINT "PushInscricao_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "bsb_garage"."Organizacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

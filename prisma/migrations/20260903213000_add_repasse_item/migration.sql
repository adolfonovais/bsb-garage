-- Liga um repasse aos itens específicos da OS que ele cobre.
CREATE TABLE "bsb_garage"."RepasseItem" (
    "id" TEXT NOT NULL,
    "repasseId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepasseItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RepasseItem_repasseId_itemId_key" ON "bsb_garage"."RepasseItem"("repasseId", "itemId");

ALTER TABLE "bsb_garage"."RepasseItem" ADD CONSTRAINT "RepasseItem_repasseId_fkey" FOREIGN KEY ("repasseId") REFERENCES "bsb_garage"."RepasseOficina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "bsb_garage"."RepasseItem" ADD CONSTRAINT "RepasseItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "bsb_garage"."OrdemServicoItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

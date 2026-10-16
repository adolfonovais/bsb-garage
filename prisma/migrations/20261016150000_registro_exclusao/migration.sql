-- Cópia de tudo que é excluído (OS, orçamento, cliente), com quem excluiu.
CREATE TABLE "bsb_garage"."RegistroExclusao" (
    "id" TEXT NOT NULL,
    "organizacaoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "referencia" TEXT NOT NULL,
    "resumo" TEXT NOT NULL,
    "dados" JSONB NOT NULL,
    "usuarioId" TEXT,
    "usuarioNome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroExclusao_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RegistroExclusao_organizacaoId_createdAt_idx" ON "bsb_garage"."RegistroExclusao"("organizacaoId", "createdAt");

ALTER TABLE "bsb_garage"."RegistroExclusao" ADD CONSTRAINT "RegistroExclusao_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "bsb_garage"."Organizacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

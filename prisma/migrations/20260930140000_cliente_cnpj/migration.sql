-- Cliente pessoa jurídica (frota de outra empresa, ou intermediária que traz
-- veículos de clientes dela pra fazer serviço aqui): adiciona CNPJ ao lado
-- do CPF já existente, os dois opcionais e independentes.
ALTER TABLE "bsb_garage"."Cliente" ADD COLUMN "cnpj" TEXT;

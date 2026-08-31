# BSB Garage Martelinho de Ouro — Sistema de Gestão

Sistema web para a oficina BSB Garage Martelinho de Ouro: orçamentos, ordens de
serviço, clientes/veículos, oficinas terceirizadas, financeiro e estoque de
peças/materiais.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Prisma](https://www.prisma.io) + PostgreSQL
- [NextAuth.js (Auth.js) v5](https://authjs.dev) — login com e-mail/senha
- Tailwind CSS
- [Nodemailer](https://nodemailer.com) — aviso por e-mail ao cliente

## Rodando localmente

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Copie `.env.example` para `.env` e preencha `DATABASE_URL` (veja abaixo) e
   `AUTH_SECRET` (gere um com `npx auth secret`).

3. Rode as migrations e o seed (cria o usuário admin, catálogo de serviços e
   dados da empresa):

   ```bash
   npx prisma migrate dev
   npm run db:seed
   ```

   O seed imprime no terminal o e-mail e a senha inicial do usuário admin.
   Troque a senha assim que possível (tela de Configurações).

4. Suba o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

   Acesse http://localhost:3000

## Banco de dados

### Desenvolvimento local

Um PostgreSQL local (instalado neste PC, ver `pg_ctl` em `C:\Users\adolf\pgsql`)
pode ser usado pra testar offline. Descomente a linha correspondente no `.env`.

### Produção (Supabase — banco compartilhado)

O banco de produção é o projeto Supabase **"Vila Maytrea Gestão"** (não um
projeto dedicado) — a conta já tinha os 2 projetos gratuitos disponíveis
ocupados por outros sistemas. Pra não misturar dados, todo o BSB Garage vive
isolado no schema Postgres **`bsb_garage`** (o `public` desse projeto continua
sendo só da Vila Maytrea — ver o comentário no topo de `prisma/schema.prisma`
e o `datasource.schemas` lá). Isso usa o recurso `multiSchema` do Prisma.

Se um dia sobrar um projeto Supabase dedicado (upgrade de plano, ou algum dos
outros projetos for descontinuado), dá pra migrar: criar o projeto novo, tirar
`schemas = ["bsb_garage"]`/`@@schema(...)` do `prisma/schema.prisma`, rodar
`prisma migrate dev` do zero lá, e restaurar os dados com `pg_dump`/`pg_restore`
filtrando pelo schema `bsb_garage`.

**Rodando migrations nesse tipo de banco compartilhado**, duas pegadinhas do
Supabase que já mordemos:

- **`migrate dev` não funciona pelo pooler** (porta 6543): esse comando
  precisa criar um "shadow database" temporário, e o pooler em modo
  transaction não permite `CREATE DATABASE`. Gere a migration localmente
  (`prisma migrate dev` contra o Postgres local) e depois aplique no Supabase
  com `prisma migrate deploy` (não precisa de shadow database).
- **A porta 5432 "Direct connection" costuma ser só IPv6**: se o ambiente não
  tiver saída IPv6, o Prisma (Node) não conecta nela mesmo que `psql` consiga.
  Use a URL do **"Session pooler"** (mesmo host do pooler, porta 5432 em vez
  de 6543) pra rodar `migrate deploy`/`db push` — ela é IPv4 e suporta os
  locks que essas operações precisam, ao contrário do transaction pooler.
- **Primeira aplicação num banco que já tem outras tabelas (de outro
  projeto)**: `migrate deploy` recusa com erro `P3005` ("database schema is
  not empty"), mesmo com o schema `bsb_garage` genuinamente vazio — ele olha
  o banco inteiro, não só o schema alvo. Nesse caso, use `prisma db push`
  pra criar as tabelas direto, seguido de `prisma migrate resolve --applied
  <nome_da_migration>` pra estabelecer a baseline do histórico de migrations
  (depois disso, `migrate deploy` funciona normalmente).

## Fotos das Ordens de Serviço

As fotos (antes/depois) ficam salvas no [Supabase Storage](https://supabase.com/docs/guides/storage),
no bucket público `bsb-garage-fotos` (criado automaticamente no primeiro
upload, dentro do mesmo projeto Supabase usado pelo banco). Isso funciona
igual local e em produção — diferente de disco local, que não sobrevive a
um deploy na Vercel (filesystem efêmero).

Para funcionar, preencha no `.env` (e nas variáveis de ambiente da Vercel):

- `NEXT_PUBLIC_SUPABASE_URL` — `https://<ref-do-projeto>.supabase.co`
  (o `<ref-do-projeto>` é o mesmo trecho que aparece no `DATABASE_URL`,
  entre `postgres.` e `:`).
- `SUPABASE_SERVICE_ROLE_KEY` — em Project Settings → API → "service_role"
  (chave secreta, nunca exponha no front-end nem commite no git). É usada
  só no servidor (`src/lib/storage.ts`), nunca chega ao navegador.

## E-mail ao cliente

Quando uma Ordem de Serviço é marcada como "Concluída", o sistema tenta
avisar o cliente por e-mail (se ele tiver e-mail cadastrado). Configure
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` e `SMTP_FROM` no `.env`
para ativar o envio de verdade — sem isso, o sistema só registra no log do
servidor que o e-mail não foi enviado, sem quebrar nada.

## Estoque

Peças/materiais (tinta, massa, verniz, lixa etc.) ficam em `/estoque`, com
alerta quando a quantidade atual fica abaixo da mínima cadastrada. A baixa
pode ser feita direto na tela da Ordem de Serviço (seção "Materiais
utilizados") — isso desconta do estoque e fica registrado como uma
movimentação vinculada àquela OS.

## Integrações pendentes (NFS-e e WhatsApp)

Ambas dependem de coisas que só você pode decidir/contratar — o código já
está pronto para ligar quando estiver:

- **NFS-e**: escolher um provedor (Focus NFe, eNotas, PlugNotas), ter
  certificado digital A1 e confirmar o CNPJ emissor. Ver `src/lib/nfse.ts`.
- **WhatsApp (Maytra)**: aguardando aprovação do app pela Meta. Ver
  `src/lib/whatsapp.ts` — quando aprovado, o aviso de OS concluída passa a
  sair também por WhatsApp, além do e-mail (`src/lib/notificacoes.ts`).

Status de ambas aparece na tela de Configurações.

## Deploy (Vercel)

1. Crie uma conta gratuita em [vercel.com](https://vercel.com) e conecte o
   repositório do GitHub deste projeto.
2. Configure as mesmas variáveis do `.env` nas configurações do projeto na
   Vercel (Environment Variables).
3. Cada `git push` na branch principal gera um novo deploy automaticamente.

## Estrutura

```
prisma/schema.prisma        Modelo do banco de dados
prisma/seed.ts               Dados iniciais (admin, catálogo de serviços, etc.)
src/lib/auth.ts               Configuração do login (NextAuth)
src/lib/prisma.ts             Cliente do Prisma
src/lib/storage.ts             Upload de fotos (Supabase Storage)
src/lib/mail.ts                 Envio de e-mail (aviso de OS concluída)
src/lib/notificacoes.ts          Ponto único de aviso ao cliente (e-mail hoje, WhatsApp depois)
src/lib/nfse.ts                  Ponto de extensão para emissão de NFS-e (ainda não ativo)
src/lib/whatsapp.ts              Ponto de extensão para aviso por WhatsApp/Maytra (ainda não ativo)
src/proxy.ts                  Proteção de rotas (equivalente ao "middleware" em Next 16)
src/app/login/                Tela de login
src/app/(app)/                Área logada:
  clientes/, orcamentos/, ordens-servico/   Módulos principais
  estoque/                                    Peças/materiais e movimentações
  oficinas/, repasses/                       Oficinas terceirizadas e repasses
  financeiro/                                 Contas a pagar/receber e caixa
  configuracoes/                              Dados da empresa, usuários e status das integrações
src/app/imprimir/              Layouts de impressão/PDF de Orçamento e OS
```

## Notas de desenvolvimento

- **`prisma.$transaction`**: sempre passe `TX_OPTIONS` (de `src/lib/prisma.ts`)
  como segundo argumento. O padrão do Prisma (`maxWait: 2000ms`) é curto
  demais em dev — a primeira vez que o Next compila uma rota pode travar o
  event loop por vários segundos e a transação estoura o prazo antes mesmo
  de começar. `TX_OPTIONS` usa 15s.
- **Checkbox / campo ausente do formulário**: `formData.get("x")` volta
  `null` (não `undefined`) quando o campo não foi enviado — um checkbox
  desmarcado, ou um input que simplesmente não existe naquele formulário.
  Schemas do Zod para esses campos precisam de `.nullable().optional()`
  (só `.optional()` não é suficiente e quebra em produção mesmo que os
  tipos do TypeScript pareçam bater).

## Roadmap

- **Fase 1**: login, clientes/veículos, orçamentos, ordens de serviço,
  conversão orçamento → OS, impressão/PDF, dashboard. ✅
- **Fase 2**: oficinas terceirizadas + repasses (com cálculo automático de
  custo/lucro), financeiro (contas a pagar/receber, alimentado
  automaticamente por OS e repasses pendentes), fotos antes/depois nas OS,
  aviso por e-mail ao cliente quando a OS fica pronta. ✅
- **Fase 3**: estoque de peças/materiais com baixa por OS e alerta de
  mínimo, pontos de extensão prontos para NFS-e e WhatsApp (Maytra). ✅

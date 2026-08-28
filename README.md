# BSB Garage Martelinho de Ouro — Sistema de Gestão

Sistema web para a oficina BSB Garage Martelinho de Ouro: orçamentos, ordens de
serviço, clientes/veículos e (nas próximas fases) oficinas terceirizadas,
financeiro e estoque.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Prisma](https://www.prisma.io) + PostgreSQL
- [NextAuth.js (Auth.js) v5](https://authjs.dev) — login com e-mail/senha
- Tailwind CSS

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
   Troque a senha assim que possível (tela de Configurações, em breve).

4. Suba o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

   Acesse http://localhost:3000

## Banco de dados

### Desenvolvimento local

Durante o desenvolvimento inicial, um PostgreSQL local (instalado neste PC) é
usado. A `DATABASE_URL` no `.env` aponta para ele.

### Produção (Supabase)

Para colocar o sistema no ar, acessível de qualquer lugar:

1. Crie uma conta gratuita em [supabase.com](https://supabase.com) e um novo
   projeto.
2. Em **Project Settings > Database > Connection string**, copie a URI (use a
   versão "Transaction pooler" para a aplicação).
3. Configure essa URL como `DATABASE_URL` nas variáveis de ambiente do seu
   deploy (Vercel).
4. Rode `npx prisma migrate deploy` apontando para o banco do Supabase (ou
   deixe isso automatizado no pipeline de deploy).

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
src/proxy.ts                  Proteção de rotas (equivalente ao "middleware" em Next 16)
src/app/login/                Tela de login
src/app/(app)/                Área logada (dashboard, clientes, orçamentos, OS, configurações)
src/app/imprimir/              Layouts de impressão/PDF de Orçamento e OS
```

## Roadmap

- **Fase 1 (atual)**: login, clientes/veículos, orçamentos, ordens de serviço,
  conversão orçamento → OS, impressão/PDF, dashboard.
- **Fase 2**: oficinas terceirizadas, financeiro, fotos antes/depois, aviso por
  e-mail ao cliente.
- **Fase 3**: estoque de peças/materiais, integrações futuras (NFS-e, WhatsApp).

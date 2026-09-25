import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prismaBase } from "@/lib/prisma-base";

// Login e sessão rodam antes de existir organização na sessão — por isso usam
// o client sem isolamento (prismaBase).

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credenciais",
      credentials: {
        email: { label: "E-mail", type: "email" },
        senha: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const senha = credentials?.senha as string | undefined;
        if (!email || !senha) return null;

        const usuario = await prismaBase.usuario.findUnique({
          where: { email: email.toLowerCase().trim() },
          include: { organizacao: { select: { ativa: true } } },
        });
        if (!usuario || !usuario.ativo || !usuario.organizacao.ativa) return null;

        const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
        if (!senhaValida) return null;

        return {
          id: usuario.id,
          name: usuario.nome,
          email: usuario.email,
          papel: usuario.papel,
          organizacaoId: usuario.organizacaoId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.papel = (user as { papel?: string }).papel ?? "FUNCIONARIO";
        token.organizacaoId = (user as { organizacaoId?: string }).organizacaoId;
      }
      // Sessões criadas antes do multi-tenant não têm organizacaoId no token —
      // busca uma vez e grava, pra ninguém precisar deslogar.
      if (!token.organizacaoId && token.id) {
        const u: { organizacaoId: string } | null = await prismaBase.usuario.findUnique({
          where: { id: token.id as string },
          select: { organizacaoId: true },
        });
        token.organizacaoId = u?.organizacaoId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.papel = token.papel as "ADMIN" | "FUNCIONARIO";
        session.user.organizacaoId = token.organizacaoId as string;
      }
      return session;
    },
  },
});

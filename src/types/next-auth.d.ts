import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      papel: "ADMIN" | "FUNCIONARIO";
      organizacaoId: string;
    } & DefaultSession["user"];
  }

  interface User {
    papel?: "ADMIN" | "FUNCIONARIO";
    organizacaoId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    papel?: "ADMIN" | "FUNCIONARIO";
    organizacaoId?: string;
  }
}

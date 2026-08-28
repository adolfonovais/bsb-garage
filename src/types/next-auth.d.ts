import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      papel: "ADMIN" | "FUNCIONARIO";
    } & DefaultSession["user"];
  }

  interface User {
    papel?: "ADMIN" | "FUNCIONARIO";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    papel?: "ADMIN" | "FUNCIONARIO";
  }
}

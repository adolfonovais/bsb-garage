import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// A partir do Prisma 7, o CLI (migrate, studio, db seed...) lê a conexão daqui.
// O PrismaClient em tempo de execução usa um driver adapter (ver src/lib/prisma.ts).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pacotes com binário/lógica específica de runtime (Chromium baixado em
  // tempo de execução) — não deixar o bundler do Next tentar empacotá-los.
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium-min"],
  experimental: {
    serverActions: {
      // Padrão do Next.js é 1MB — pequeno demais para o upload de fotos das
      // OS (até 10MB, ver TAMANHO_MAXIMO em src/lib/storage.ts). Aumentado
      // com margem para a sobrecarga do multipart/form-data.
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;

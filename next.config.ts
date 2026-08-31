import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

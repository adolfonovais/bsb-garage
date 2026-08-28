import { randomUUID } from "crypto";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";

// Armazenamento de arquivos (fotos das OS). Hoje salva em disco local
// (public/uploads), o que já funciona rodando no seu PC ou num servidor
// próprio. Quando o projeto migrar para o Supabase (ver README.md), troque
// só a implementação destas duas funções para usar o Supabase Storage — o
// resto do app (formulários, banco) não precisa mudar.

const PASTA_UPLOADS = path.join(process.cwd(), "public", "uploads");
const TIPOS_ACEITOS = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const TAMANHO_MAXIMO = 10 * 1024 * 1024; // 10MB

export async function salvarFoto(pasta: string, arquivo: File): Promise<string> {
  if (!TIPOS_ACEITOS.has(arquivo.type)) {
    throw new Error("Formato de imagem não suportado. Envie JPG, PNG, WEBP ou GIF.");
  }
  if (arquivo.size > TAMANHO_MAXIMO) {
    throw new Error("Imagem muito grande (máximo 10MB).");
  }

  const destino = path.join(PASTA_UPLOADS, pasta);
  await mkdir(destino, { recursive: true });

  const extensao = arquivo.type.split("/")[1] || "jpg";
  const nomeArquivo = `${randomUUID()}.${extensao}`;
  const bytes = Buffer.from(await arquivo.arrayBuffer());
  await writeFile(path.join(destino, nomeArquivo), bytes);

  return `/uploads/${pasta}/${nomeArquivo}`;
}

export async function removerFoto(url: string): Promise<void> {
  if (!url.startsWith("/uploads/")) return; // não apaga nada fora da pasta de uploads
  const caminho = path.join(process.cwd(), "public", url);
  await unlink(caminho).catch(() => {
    // arquivo já pode ter sido removido manualmente — não é um erro fatal
  });
}

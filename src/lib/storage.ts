import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";

// Armazenamento de arquivos (fotos das OS) usando o Supabase Storage — o
// disco local não funciona em produção (o filesystem da Vercel é somente
// leitura em runtime e não sobrevive a um novo deploy).

const BUCKET = "bsb-garage-fotos";
const TIPOS_ACEITOS = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const TAMANHO_MAXIMO = 10 * 1024 * 1024; // 10MB

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) {
    throw new Error(
      "Supabase Storage não configurado: preencha NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env."
    );
  }
  return createClient(url, chave, { auth: { persistSession: false } });
}

let bucketGarantido = false;

async function garantirBucket(supabase: ReturnType<typeof supabaseAdmin>) {
  if (bucketGarantido) return;
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    allowedMimeTypes: [...TIPOS_ACEITOS],
  });
  // Em cold starts subsequentes o bucket já existe — isso é esperado, não é erro.
  const jaExiste =
    error && (/already exists/i.test(error.message) || (error as { statusCode?: string }).statusCode === "409");
  if (error && !jaExiste) {
    throw new Error(`Não foi possível preparar o armazenamento de fotos: ${error.message}`);
  }
  bucketGarantido = true;
}

export async function salvarFoto(pasta: string, arquivo: File): Promise<string> {
  if (!TIPOS_ACEITOS.has(arquivo.type)) {
    throw new Error("Formato de imagem não suportado. Envie JPG, PNG, WEBP ou GIF.");
  }
  if (arquivo.size > TAMANHO_MAXIMO) {
    throw new Error("Imagem muito grande (máximo 10MB).");
  }

  const supabase = supabaseAdmin();
  await garantirBucket(supabase);

  const extensao = arquivo.type.split("/")[1] || "jpg";
  const caminho = `${pasta}/${randomUUID()}.${extensao}`;
  const bytes = Buffer.from(await arquivo.arrayBuffer());

  const { error } = await supabase.storage.from(BUCKET).upload(caminho, bytes, {
    contentType: arquivo.type,
    upsert: false,
  });
  if (error) {
    throw new Error(`Falha ao enviar a imagem: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(caminho);
  return data.publicUrl;
}

export async function removerFoto(url: string): Promise<void> {
  const marcador = `/storage/v1/object/public/${BUCKET}/`;
  const indice = url.indexOf(marcador);
  if (indice === -1) return; // não é uma foto deste bucket (ex.: já removida, ou URL antiga)

  const caminho = url.slice(indice + marcador.length);
  const supabase = supabaseAdmin();
  await supabase.storage
    .from(BUCKET)
    .remove([caminho])
    .catch(() => {
      // arquivo já pode ter sido removido manualmente — não é um erro fatal
    });
}

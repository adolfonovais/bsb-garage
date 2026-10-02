import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prismaBase } from "@/lib/prisma-base";
import { lerToken } from "@/lib/tokens";

/**
 * Autoriza o acesso a uma página de impressão (OS/Orçamento/NFS-e) de duas
 * formas: sessão de usuário normal (fluxo humano, botão "Imprimir / PDF") ou
 * um token interno de curta duração — ver "pdf-interno" em src/lib/tokens.ts
 * (fluxo do próprio servidor, abrindo a página num Chromium headless pra
 * gerar o PDF que vai anexado no WhatsApp; nunca exposto ao cliente final).
 *
 * Devolve a organizacaoId autorizada a ver esse documento, ou redireciona
 * pro login se nenhum dos dois bater — as páginas de impressão então usam
 * `prismaBase` com essa organizacaoId no `where`, em vez do `prisma`
 * (que exige sessão), pra funcionar nos dois casos.
 */
export async function organizacaoParaImpressao(
  doc: "os" | "orcamento" | "nfse",
  id: string,
  token: string | undefined
): Promise<string> {
  const viaToken = lerToken(token, "pdf-interno");
  if (viaToken && viaToken.doc === doc && viaToken.id === id) {
    // O id já veio de um token assinado pelo próprio servidor — só falta
    // achar a organização dona do registro (NFS-e é um campo da própria OS).
    const registro = await prismaBase.ordemServico.findUnique({
      where: { id },
      select: { organizacaoId: true },
    });
    if (doc !== "orcamento" && registro) return registro.organizacaoId;
    if (doc === "orcamento") {
      const orcamento = await prismaBase.orcamento.findUnique({ where: { id }, select: { organizacaoId: true } });
      if (orcamento) return orcamento.organizacaoId;
    }
  }

  const session = await auth();
  if (!session?.user?.organizacaoId) redirect("/login");
  return session.user.organizacaoId;
}

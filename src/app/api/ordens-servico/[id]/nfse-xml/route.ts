import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { numeroFormatado } from "@/lib/format";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Não autenticado.", { status: 401 });
  }

  const { id } = await params;
  const os = await prisma.ordemServico.findUnique({
    where: { id },
    select: { numero: true, ano: true, nfseXml: true },
  });

  if (!os?.nfseXml) {
    return new Response("Esta OS ainda não tem NFS-e emitida.", { status: 404 });
  }

  const nomeArquivo = `NFSe-${numeroFormatado(os.numero, os.ano)}.xml`;

  return new Response(os.nfseXml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
    },
  });
}

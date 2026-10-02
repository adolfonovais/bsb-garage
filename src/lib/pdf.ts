// Gera PDF a partir de uma página do próprio app (Orçamento/OS/NFS-e
// impressos), pra anexar no WhatsApp — sem headless browser instalado no
// servidor, usamos @sparticuz/chromium-min (baixa o Chromium comprimido de
// um release do GitHub na primeira execução, guarda em /tmp; execuções
// seguintes no mesmo ambiente reaproveitam) + puppeteer-core.
//
// Versão do pacote e do Chromium baixado PRECISAM casar (puppeteer-core
// 25.x ↔ @sparticuz/chromium-min 153.x, instalados juntos) — se um dia
// atualizar um, atualizar o outro e o CHROMIUM_PACK_URL default junto.
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";

const CHROMIUM_PACK_URL =
  process.env.CHROMIUM_PACK_URL ||
  "https://github.com/Sparticuz/chromium/releases/download/v153.0.0/chromium-v153.0.0-pack.x64.tar";

/**
 * Abre `url` (uma página do próprio Garage Flow, já com o token interno de
 * acesso) num Chromium headless e devolve o PDF da página como ela aparece
 * impressa (mesmo resultado do botão "Imprimir / PDF" no navegador).
 */
export async function gerarPdfDeUrl(url: string): Promise<Buffer> {
  // O Chromium baixado pelo @sparticuz/chromium-min é um binário Linux — só
  // roda no ambiente da Vercel (ou outro Linux), nunca no Windows/Mac do dev
  // local. Erro claro em vez de deixar o puppeteer falhar com algo confuso.
  if (!process.env.VERCEL && process.platform !== "linux") {
    throw new Error(
      "Geração de PDF só funciona no ambiente da Vercel (o Chromium baixado é um binário Linux) — teste depois de publicar."
    );
  }

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(CHROMIUM_PACK_URL),
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle0", timeout: 20_000 });
    const pdf = await page.pdf({ format: "a4", printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

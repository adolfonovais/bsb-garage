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

  const inicio = Date.now();
  const executablePath = await chromium.executablePath(CHROMIUM_PACK_URL);
  console.log(`[pdf] Chromium pronto em ${Date.now() - inicio}ms`);
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath,
    headless: "shell",
  });
  console.log(`[pdf] Chromium aberto em ${Date.now() - inicio}ms`);

  try {
    const page = await browser.newPage();
    const semToken = (u: string) => u.split("?")[0].slice(0, 120);
    page.on("response", (r) => console.log(`[pdf] ${r.status()} ${semToken(r.url())}`));
    page.on("requestfailed", (r) => console.log(`[pdf] FALHOU ${semToken(r.url())} ${r.failure()?.errorText}`));

    // "load" (e não networkidle0): a página de impressão não tem polling, mas
    // qualquer requisição pendurada (prefetch, fonte externa) faria o
    // networkidle0 nunca resolver e estourar o timeout.
    await page.goto(url, { waitUntil: "load", timeout: 45_000 });
    console.log(`[pdf] Página carregada em ${Date.now() - inicio}ms`);
    await page.evaluate(() =>
      Promise.all([
        document.fonts.ready,
        ...Array.from(document.images).map((img) =>
          img.complete ? null : new Promise((ok) => { img.onload = img.onerror = ok; })
        ),
      ])
    );

    const pdf = await page.pdf({ format: "a4", printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } });
    console.log(`[pdf] PDF gerado em ${Date.now() - inicio}ms (${pdf.length} bytes)`);
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

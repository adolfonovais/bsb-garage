// Marca da plataforma (a que aparece em login, cadastro e no título do site).
// Nome PROVISÓRIO — enquanto o nome/domínio definitivo não existe, troque aqui
// (ou pela env NEXT_PUBLIC_PLATAFORMA_NOME) e o resto do app acompanha.
export const NOME_PLATAFORMA = process.env.NEXT_PUBLIC_PLATAFORMA_NOME || "Oficina Gestão";
export const SLOGAN_PLATAFORMA = "Orçamentos, ordens de serviço, repasses e financeiro da sua oficina em um só lugar.";

// Dias de teste grátis de uma organização nova (sem cobrança por enquanto —
// ver estratégia de lançamento; a estrutura de plano já existe em Organizacao).
export const DIAS_DE_TESTE = 30;

// Cadastro público (/cadastro). Fechado por padrão: só abre com
// CADASTRO_ABERTO=true no ambiente (Vercel), quando você decidir lançar.
export const cadastroAberto = () => process.env.CADASTRO_ABERTO === "true";

// A organização #1 (BSB Garage) mantém a logo própria; as demais usam o ícone padrão.
export const SLUG_ORGANIZACAO_COM_LOGO = "bsb-garage";

/** Dias restantes do teste grátis (null se a organização não está em teste). */
export function diasRestantesDoTeste(org: { plano: string; trialTerminaEm: Date | null }): number | null {
  if (org.plano !== "trial" || !org.trialTerminaEm) return null;
  return Math.ceil((org.trialTerminaEm.getTime() - Date.now()) / 86_400_000);
}

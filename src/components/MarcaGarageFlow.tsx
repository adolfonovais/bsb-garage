import { NOME_PLATAFORMA } from "@/lib/marca";

type Variante = "horizontal-light" | "horizontal-dark" | "compact-light" | "compact-dark" | "stacked-light";

/** Assinatura Garage Flow (SVG do kit de marca). "light" = pra fundo claro, "dark" = pra fundo escuro. */
export function MarcaGarageFlow({ variante = "horizontal-light", className }: { variante?: Variante; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG estático; o otimizador de imagem não roda nesta arquitetura
    <img src={`/brand/garage-flow/svg/garage-flow-${variante}.svg`} alt={NOME_PLATAFORMA} className={className} />
  );
}
